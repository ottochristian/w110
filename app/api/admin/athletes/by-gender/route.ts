import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/server'



type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type GenderDistribution = {
  gender: string
  count: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seasonId = searchParams.get('seasonId')
  const requestedClubId = searchParams.get('clubId')
  const programId = searchParams.get('programId')

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

  // Build base query
  let registrationsQuery = admin
    .from('registrations')
    .select(`
      athlete_id,
      athletes!inner(
        id,
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

  const { data: registrations, error: registrationsError } = await registrationsQuery

  if (registrationsError) {
    console.error('Athletes by gender error:', registrationsError)
    return NextResponse.json(
      { error: registrationsError.message || 'Failed to load athletes by gender' },
      { status: 500 }
    )
  }

  // Count unique athletes by gender
  const genderMap = new Map<string, Set<string>>()

  ;(registrations || []).forEach((reg: any) => {
    const gender = reg.athletes?.gender || 'Unknown'
    const athleteId = reg.athlete_id

    if (athleteId) {
      if (!genderMap.has(gender)) {
        genderMap.set(gender, new Set())
      }
      genderMap.get(gender)!.add(athleteId)
    }
  })

  const distribution: GenderDistribution[] = Array.from(genderMap.entries())
    .map(([gender, athletes]) => {
      const genderLower = gender?.toLowerCase()
      let displayGender = 'Unknown'
      
      if (genderLower === 'male' || genderLower === 'm') {
        displayGender = 'Male'
      } else if (genderLower === 'female' || genderLower === 'f') {
        displayGender = 'Female'
      } else if (gender && gender !== 'Unknown') {
        displayGender = 'Other'
      }
      
      return {
        gender: displayGender,
        count: athletes.size,
      }
    })
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ distribution })
}
