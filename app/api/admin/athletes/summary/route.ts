import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type AthleteSummary = {
  totalAthletes: number
  newAthletes: number
  returningAthletes: number
  uniqueHouseholds: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seasonId = searchParams.get('seasonId')
  const requestedClubId = searchParams.get('clubId')
  const programId = searchParams.get('programId')
  const gender = searchParams.get('gender')

  // Require admin authentication
  const authResult = await requireAdmin(req)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user, supabase, profile } = authResult
  const role = profile.role as ProfileRole
  const isSystemAdmin = role === 'system_admin'
  const clubIdToUse = isSystemAdmin ? requestedClubId : profile.club_id

  if (!seasonId) {
    return NextResponse.json(
      { error: 'seasonId is required' },
      { status: 400 }
    )
  }

  if (!clubIdToUse) {
    return NextResponse.json(
      { error: 'clubId is required' },
      { status: 400 }
    )
  }

  if (!isSystemAdmin && clubIdToUse !== profile.club_id) {
    return NextResponse.json({ error: 'Forbidden: club mismatch' }, { status: 403 })
  }

  if (isSystemAdmin && !requestedClubId) {
    return NextResponse.json(
      { error: 'clubId is required for system admins' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // Build base query for registrations in this season/club
  let registrationsQuery = admin
    .from('registrations')
    .select(`
      id,
      athlete_id,
      athletes!inner(
        id,
        household_id,
        gender
      ),
      sub_programs!inner(
        id,
        program_id
      )
    `)
    .eq('season_id', seasonId)
    .eq('club_id', clubIdToUse)

  // Apply program filter
  if (programId && programId !== 'all') {
    registrationsQuery = registrationsQuery.eq('sub_programs.program_id', programId)
  }

  // Apply gender filter
  if (gender && gender !== 'all') {
    registrationsQuery = registrationsQuery.eq('athletes.gender', gender)
  }

  const { data: registrations, error: registrationsError } = await registrationsQuery

  if (registrationsError) {
    console.error('Athletes summary error:', registrationsError)
    return NextResponse.json(
      { error: registrationsError.message || 'Failed to load athlete summary' },
      { status: 500 }
    )
  }

  // Calculate metrics
  const uniqueAthleteIds = new Set((registrations || []).map((r: any) => r.athlete_id))
  const uniqueHouseholdIds = new Set(
    (registrations || [])
      .map((r: any) => r.athletes?.household_id)
      .filter(Boolean)
  )

  const totalAthletes = uniqueAthleteIds.size
  const uniqueHouseholds = uniqueHouseholdIds.size

  // Get previous season's athletes to calculate new vs returning
  const { data: previousSeasons } = await admin
    .from('seasons')
    .select('id, name, start_date')
    .eq('club_id', clubIdToUse)
    .neq('id', seasonId)
    .order('start_date', { ascending: false })
    .limit(1)

  let returningAthletes = 0
  
  if (previousSeasons && previousSeasons.length > 0) {
    const previousSeasonId = previousSeasons[0].id
    
    const { data: previousRegistrations } = await admin
      .from('registrations')
      .select('athlete_id')
      .eq('season_id', previousSeasonId)
      .eq('club_id', clubIdToUse)
      .in('athlete_id', Array.from(uniqueAthleteIds))

    const previousAthleteIds = new Set(
      (previousRegistrations || []).map((r: any) => r.athlete_id)
    )
    
    returningAthletes = previousAthleteIds.size
  }

  const newAthletes = totalAthletes - returningAthletes

  return NextResponse.json({
    totalAthletes,
    newAthletes,
    returningAthletes,
    uniqueHouseholds,
  })
}
