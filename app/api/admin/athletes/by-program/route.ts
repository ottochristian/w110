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

  const { profile } = authResult
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

  const { data: programsData, error } = await admin.rpc('get_athletes_by_program', {
    p_season_id: seasonId,
    p_club_id: clubIdToUse,
    p_program_id: programId && programId !== 'all' ? programId : null,
    p_gender: gender && gender !== 'all' ? gender : null
  })

  if (error) {
    console.error('Athletes by program error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load athletes by program' },
      { status: 500 }
    )
  }

  const programs: ProgramAthletes[] = (programsData || []).map((row: any) => ({
    programId: row.program_id,
    programName: row.program_name,
    athleteCount: Number(row.athlete_count) || 0
  }))

  return NextResponse.json({ programs })
}
