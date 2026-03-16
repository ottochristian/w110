import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'
import { trackApiCall } from '@/lib/metrics'

/**
 * System Admin Clubs API
 * Returns all clubs with their counts
 * 
 * GET /api/system-admin/clubs
 * 
 * Requires: System admin authentication
 * Uses service role to bypass RLS for system-wide visibility
 */
export async function GET(request: NextRequest) {
  const start = Date.now()
  // Require admin authentication
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { profile } = authResult

  // Only system admins can access this
  if (profile.role !== 'system_admin') {
    return NextResponse.json(
      { error: 'Forbidden: System admin access required' },
      { status: 403 }
    )
  }

  // Use admin client to bypass RLS
  const supabase = createAdminClient()

  try {
    // Get all clubs
    const { data: clubs, error: clubsError } = await supabase
      .from('clubs')
      .select('*')
      .order('name', { ascending: true })

    if (clubsError) {
      throw clubsError
    }

    // Get counts - use RPC for athletes (bypasses 1000-row limit), fetch others
    // Admins and programs are small datasets; athletes can be 200k+
    const [
      { data: adminsByClub },
      athleteCountsResult,
      { data: programsByClub }
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('club_id')
        .eq('role', 'admin')
        .not('club_id', 'is', null),
      supabase.rpc('get_club_athlete_counts'),
      supabase
        .from('programs')
        .select('club_id')
        .not('club_id', 'is', null)
    ])

    const adminCounts = (adminsByClub || []).reduce((acc, row) => {
      acc[row.club_id] = (acc[row.club_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Use RPC result if available; fallback to empty (run migration 61 for accurate counts)
    let athleteCounts: Record<string, number> = {}
    if (athleteCountsResult.data && !athleteCountsResult.error) {
      athleteCounts = (athleteCountsResult.data || []).reduce((acc, row) => {
        acc[row.club_id] = Number(row.athlete_count) || 0
        return acc
      }, {} as Record<string, number>)
    } else if (athleteCountsResult.error) {
      console.warn('[Clubs API] get_club_athlete_counts RPC failed:', athleteCountsResult.error.message, '- Run migration 61 for accurate counts')
    }

    const programCounts = (programsByClub || []).reduce((acc, row) => {
      acc[row.club_id] = (acc[row.club_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Attach counts to clubs
    const clubsWithCounts = (clubs || []).map(club => ({
      ...club,
      admin_count: adminCounts[club.id] || 0,
      athlete_count: athleteCounts[club.id] || 0,
      program_count: programCounts[club.id] || 0
    }))

    const response = NextResponse.json({
      timestamp: new Date().toISOString(),
      clubs: clubsWithCounts
    })
    trackApiCall(request.nextUrl.pathname, Date.now() - start, 200)
    return response

  } catch (error: any) {
    console.error('Error fetching clubs:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch clubs' },
      { status: 500 }
    )
  }
}
