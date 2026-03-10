import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/server'



type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type ProgramAthletes = {
  programId: string
  programName: string
  athleteCount: number
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
        program_id,
        programs!inner(
          id,
          name
        )
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
    console.error('Athletes by program error:', registrationsError)
    return NextResponse.json(
      { error: registrationsError.message || 'Failed to load athletes by program' },
      { status: 500 }
    )
  }

  // Group by program and count unique athletes
  const programMap = new Map<string, { name: string; athletes: Set<string> }>()

  ;(registrations || []).forEach((reg: any) => {
    const progId = reg.sub_programs?.programs?.id
    const progName = reg.sub_programs?.programs?.name
    const athleteId = reg.athlete_id

    if (progId && progName && athleteId) {
      if (!programMap.has(progId)) {
        programMap.set(progId, { name: progName, athletes: new Set() })
      }
      programMap.get(progId)!.athletes.add(athleteId)
    }
  })

  const programs: ProgramAthletes[] = Array.from(programMap.entries())
    .map(([programId, data]) => ({
      programId,
      programName: data.name,
      athleteCount: data.athletes.size,
    }))
    .sort((a, b) => b.athleteCount - a.athleteCount)

  return NextResponse.json({ programs })
}
