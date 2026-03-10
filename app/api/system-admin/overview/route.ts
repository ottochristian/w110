import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'

/**
 * System Admin Overview API
 * Returns comprehensive system-wide statistics
 * 
 * GET /api/system-admin/overview
 * 
 * Requires: System admin authentication
 */
export async function GET(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, profile } = authResult

  // Only system admins can access this
  if (profile.role !== 'system_admin') {
    return NextResponse.json(
      { error: 'Forbidden: System admin access required' },
      { status: 403 }
    )
  }

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
      { count: totalParents },
      { data: recentSignIns }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'coach'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'parent'),
      supabase.from('profiles')
        .select('id')
        .gte('last_sign_in_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ])

    stats.users = {
      total: totalProfiles || 0,
      admins: totalAdmins || 0,
      coaches: totalCoaches || 0,
      parents: totalParents || 0,
      activeToday: recentSignIns?.length || 0
    }

    // 3. Athletes Statistics
    const [
      { count: totalAthletes },
      { data: athletesByGender }
    ] = await Promise.all([
      supabase.from('athletes').select('*', { count: 'exact', head: true }),
      supabase.from('athletes').select('gender')
    ])

    const genderCounts = athletesByGender?.reduce((acc: any, a) => {
      acc[a.gender || 'unknown'] = (acc[a.gender || 'unknown'] || 0) + 1
      return acc
    }, {}) || {}

    stats.athletes = {
      total: totalAthletes || 0,
      male: genderCounts.male || 0,
      female: genderCounts.female || 0,
      other: genderCounts.other || 0
    }

    // 4. Programs Statistics
    const [
      { count: totalPrograms },
      { count: activePrograms },
      { count: draftPrograms },
      { data: programsBySport }
    ] = await Promise.all([
      supabase.from('programs').select('*', { count: 'exact', head: true }),
      supabase.from('programs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('programs').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('programs').select('sport')
    ])

    const sportCounts = programsBySport?.reduce((acc: any, p) => {
      acc[p.sport || 'unknown'] = (acc[p.sport || 'unknown'] || 0) + 1
      return acc
    }, {}) || {}

    stats.programs = {
      total: totalPrograms || 0,
      active: activePrograms || 0,
      draft: draftPrograms || 0,
      archived: (totalPrograms || 0) - (activePrograms || 0) - (draftPrograms || 0),
      bySport: sportCounts
    }

    // 5. Registrations & Revenue (Last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const [
      { count: totalRegistrations },
      { data: recentRegistrations },
      { data: paidRegistrations }
    ] = await Promise.all([
      supabase.from('registrations').select('*', { count: 'exact', head: true }),
      supabase.from('registrations').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
      supabase.from('registrations')
        .select('amount_paid, payment_status')
        .eq('payment_status', 'paid')
        .gte('created_at', thirtyDaysAgo)
    ])

    const totalRevenue = paidRegistrations?.reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0) || 0

    stats.registrations = {
      total: totalRegistrations || 0,
      last30Days: recentRegistrations || 0
    }

    stats.revenue = {
      last30Days: totalRevenue,
      formatted: `$${(totalRevenue / 100).toFixed(2)}`,
      paidCount: paidRegistrations?.length || 0
    }

    // 6. Payments Analysis
    const [
      { data: allPayments },
      { count: failedPayments }
    ] = await Promise.all([
      supabase.from('registrations').select('payment_status, created_at').gte('created_at', thirtyDaysAgo),
      supabase.from('registrations')
        .select('*', { count: 'exact', head: true })
        .in('payment_status', ['failed', 'refunded'])
        .gte('created_at', thirtyDaysAgo)
    ])

    const paymentStatusCounts = allPayments?.reduce((acc: any, p) => {
      acc[p.payment_status || 'unknown'] = (acc[p.payment_status || 'unknown'] || 0) + 1
      return acc
    }, {}) || {}

    stats.payments = {
      paid: paymentStatusCounts.paid || 0,
      pending: paymentStatusCounts.pending || 0,
      failed: failedPayments || 0,
      successRate: allPayments && allPayments.length > 0
        ? Math.round(((paymentStatusCounts.paid || 0) / allPayments.length) * 100)
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

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      stats
    })

  } catch (error: any) {
    console.error('[System Admin API] Failed to fetch overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overview', details: error.message },
      { status: 500 }
    )
  }
}
