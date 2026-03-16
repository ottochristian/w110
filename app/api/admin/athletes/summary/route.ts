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

  const { data, error } = await admin.rpc('get_athlete_summary', {
    p_season_id: seasonId,
    p_club_id: clubIdToUse,
    p_program_id: programId && programId !== 'all' ? programId : null,
    p_gender: gender && gender !== 'all' ? gender : null
  })

  if (error) {
    console.error('Athletes summary error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load athlete summary' },
      { status: 500 }
    )
  }

  const row = data?.[0]
  return NextResponse.json({
    totalAthletes: Number(row?.total_athletes || 0),
    newAthletes: Number(row?.new_athletes || 0),
    returningAthletes: Number(row?.returning_athletes || 0),
    uniqueHouseholds: Number(row?.unique_households || 0),
  })
}
