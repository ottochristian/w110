import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'
import { trackApiCall } from '@/lib/metrics'

/**
 * System Admin Overview API
 * Returns comprehensive system-wide statistics
 * 
 * GET /api/system-admin/overview
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

  // Use admin client to bypass RLS for system-wide stats
  const supabase = createAdminClient()

  try {
    const stats: any = {}

    // 1. Clubs Statistics
    const [
      { count: totalClubs },
      { data: activeClubsData },
      { data: clubsWithPrograms }
    ] = await Promise.all([
      supabase.from('clubs').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('club_id').eq('role', 'admin').not('club_id', 'is', null),
      supabase.from('programs').select('club_id').eq('status', 'active')
    ])

    const activeClubIds = new Set(activeClubsData?.map(p => p.club_id) || [])
    const clubsWithActiveProgramsIds = new Set(clubsWithPrograms?.map(p => p.club_id) || [])

    stats.clubs = {
      total: totalClubs || 0,
      withAdmins: activeClubIds.size,
      withActivePrograms: clubsWithActiveProgramsIds.size,
      inactive: (totalClubs || 0) - activeClubIds.size
    }

    // 2. Users Statistics
    const [
      { count: totalProfiles },
      { count: totalAdmins },
      { count: totalCoaches },
      { count: totalParents }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'coach'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'parent')
    ])

    // Query auth.users for sign-in data (last_sign_in_at is tracked there)
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const activeToday = authUsers?.users?.filter(u => {
      if (!u.last_sign_in_at) return false
      return new Date(u.last_sign_in_at).getTime() > oneDayAgo
    }).length || 0

    stats.users = {
      total: totalProfiles || 0,
      admins: totalAdmins || 0,
      coaches: totalCoaches || 0,
      parents: totalParents || 0,
      activeToday
    }

    // 3. Athletes Statistics (use RPC - bypasses 1000-row limit)
    const [
      { count: totalAthletes },
      genderResult
    ] = await Promise.all([
      supabase.from('athletes').select('*', { count: 'exact', head: true }),
      supabase.rpc('get_athlete_gender_counts')
    ])

    const genderCounts = (genderResult.data || []).reduce((acc: any, row) => {
      acc[row.gender || 'unknown'] = Number(row.count) || 0
      return acc
    }, {})

    stats.athletes = {
      total: totalAthletes || 0,
      male: genderCounts.male || 0,
      female: genderCounts.female || 0,
      other: (genderCounts.other || 0) + (genderCounts.unknown || 0)
    }

    // 4. Programs Statistics (use RPC - bypasses 1000-row limit)
    const [
      { count: totalPrograms },
      { count: activePrograms },
      { count: draftPrograms },
      sportResult
    ] = await Promise.all([
      supabase.from('programs').select('*', { count: 'exact', head: true }),
      supabase.from('programs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('programs').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.rpc('get_program_sport_counts')
    ])

    const sportCounts = (sportResult.data || []).reduce((acc: any, row) => {
      acc[row.sport || 'unknown'] = Number(row.count) || 0
      return acc
    }, {})

    stats.programs = {
      total: totalPrograms || 0,
      active: activePrograms || 0,
      draft: draftPrograms || 0,
      archived: (totalPrograms || 0) - (activePrograms || 0) - (draftPrograms || 0),
      bySport: sportCounts
    }

    // 5. Registrations & Revenue (use RPC - bypasses 1000-row limit)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: totalRegistrations },
      revenueResult,
      paymentResult
    ] = await Promise.all([
      supabase.from('registrations').select('*', { count: 'exact', head: true }),
      supabase.rpc('get_registration_revenue_summary', { p_since: thirtyDaysAgo }),
      supabase.rpc('get_payment_status_counts', { p_since: thirtyDaysAgo })
    ])

    const revenueRow = revenueResult.data?.[0]
    const totalRevenue = Number(revenueRow?.total_revenue || 0)
    const paidCount = Number(revenueRow?.paid_count || 0)
    const last30Count = Number(revenueRow?.total_count || 0)

    stats.registrations = {
      total: totalRegistrations || 0,
      last30Days: last30Count
    }

    stats.revenue = {
      last30Days: totalRevenue,
      formatted: `$${(totalRevenue / 100).toFixed(2)}`,
      paidCount
    }

    // 6. Payments Analysis (from RPC)
    const paymentStatusCounts = (paymentResult.data || []).reduce((acc: any, row) => {
      acc[row.payment_status || 'unknown'] = Number(row.count) || 0
      return acc
    }, {})

    const totalPayments30d = (paymentResult.data || []).reduce((sum, row) => sum + Number(row.count || 0), 0)

    stats.payments = {
      paid: paymentStatusCounts.paid || 0,
      pending: paymentStatusCounts.pending || 0,
      failed: (paymentStatusCounts.failed || 0) + (paymentStatusCounts.refunded || 0),
      successRate: totalPayments30d > 0
        ? Math.round(((paymentStatusCounts.paid || 0) / totalPayments30d) * 100)
        : 0
    }

    // 7. System Health Summary
    const [
      { data: errorMetrics },
      { data: webhookMetrics }
    ] = await Promise.all([
      supabase.from('application_metrics')
        .select('id')
        .eq('metric_name', 'error.occurred')
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('application_metrics')
        .select('metric_name')
        .in('metric_name', ['webhook.succeeded', 'webhook.failed'])
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ])

    const webhookSucceeded = webhookMetrics?.filter(m => m.metric_name === 'webhook.succeeded').length || 0
    const webhookFailed = webhookMetrics?.filter(m => m.metric_name === 'webhook.failed').length || 0
    const totalWebhooks = webhookSucceeded + webhookFailed

    stats.systemHealth = {
      errors24h: errorMetrics?.length || 0,
      webhooksProcessed24h: totalWebhooks,
      webhookSuccessRate: totalWebhooks > 0 ? Math.round((webhookSucceeded / totalWebhooks) * 100) : 100
    }

    const response = NextResponse.json({
      timestamp: new Date().toISOString(),
      stats
    })
    trackApiCall(request.nextUrl.pathname, Date.now() - start, 200)
    return response

  } catch (error: any) {
    console.error('[System Admin API] Failed to fetch overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overview', details: error.message },
      { status: 500 }
    )
  }
}
