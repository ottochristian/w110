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

  const { data, error } = await admin.rpc('get_athletes_by_gender', {
    p_season_id: seasonId,
    p_club_id: clubIdToUse,
    p_program_id: programId && programId !== 'all' ? programId : null
  })

  if (error) {
    console.error('Athletes by gender error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load athletes by gender' },
      { status: 500 }
    )
  }

  const distribution: GenderDistribution[] = (data || []).map((row: any) => ({
    gender: row.gender,
    count: Number(row.count) || 0
  }))

  return NextResponse.json({ distribution })
}
