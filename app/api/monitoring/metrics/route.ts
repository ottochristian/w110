import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'

/**
 * Business Metrics Endpoint
 * Returns key business metrics for monitoring dashboard
 * 
 * GET /api/monitoring/metrics?period=24h|7d|30d
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

  // Only system admins can access monitoring
  if (profile.role !== 'system_admin') {
    return NextResponse.json(
      { error: 'Forbidden: System admin access required' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || '24h'

  // Calculate time range
  const hours = period === '7d' ? 168 : period === '30d' ? 720 : 24
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  const metrics: any = {}

  try {
    // 1. Registration Metrics
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('id, created_at, payment_status')
      .gte('created_at', since)

    if (!regError && registrations) {
      const currentCount = registrations.length
      
      // Calculate previous period for comparison
      const previousSince = new Date(Date.now() - 2 * hours * 60 * 60 * 1000).toISOString()
      const { data: previousRegs } = await supabase
        .from('registrations')
        .select('id')
        .gte('created_at', previousSince)
        .lt('created_at', since)

      const previousCount = previousRegs?.length || 0
      const trend = previousCount > 0 
        ? Math.round(((currentCount - previousCount) / previousCount) * 100)
        : 0

      // Generate sparkline data (hourly counts)
      const sparkline = generateSparkline(registrations, 'created_at', hours)

      metrics.registrations = {
        count: currentCount,
        trend: trend > 0 ? `+${trend}%` : `${trend}%`,
        trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat',
        sparkline,
        period: `Last ${period}`
      }
    }

    // 2. Revenue Metrics
    const { data: payments, error: payError } = await supabase
      .from('registrations')
      .select('amount_paid, payment_status, created_at')
      .gte('created_at', since)
      .eq('payment_status', 'paid')

    if (!payError && payments) {
      const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0)

      // Previous period revenue
      const previousSince = new Date(Date.now() - 2 * hours * 60 * 60 * 1000).toISOString()
      const { data: previousPayments } = await supabase
        .from('registrations')
        .select('amount_paid')
        .gte('created_at', previousSince)
        .lt('created_at', since)
        .eq('payment_status', 'paid')

      const previousRevenue = previousPayments?.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0) || 0
      const revenueTrend = previousRevenue > 0
        ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
        : 0

      const sparkline = generateRevenueSparkline(payments, 'created_at', hours)

      metrics.revenue = {
        amount: totalRevenue,
        formatted: `$${(totalRevenue / 100).toFixed(2)}`,
        trend: revenueTrend > 0 ? `+${revenueTrend}%` : `${revenueTrend}%`,
        trendDirection: revenueTrend > 0 ? 'up' : revenueTrend < 0 ? 'down' : 'flat',
        sparkline,
        period: `Last ${period}`
      }
    }

    // 3. Failed Payments
    const { data: failedPayments, error: failError } = await supabase
      .from('registrations')
      .select('id, created_at')
      .gte('created_at', since)
      .in('payment_status', ['failed', 'pending', 'refunded'])

    if (!failError && failedPayments) {
      const currentFailed = failedPayments.length

      const previousSince = new Date(Date.now() - 2 * hours * 60 * 60 * 1000).toISOString()
      const { data: previousFailed } = await supabase
        .from('registrations')
        .select('id')
        .gte('created_at', previousSince)
        .lt('created_at', since)
        .in('payment_status', ['failed', 'pending', 'refunded'])

      const previousFailedCount = previousFailed?.length || 0
      const failedTrend = previousFailedCount > 0
        ? Math.round(((currentFailed - previousFailedCount) / previousFailedCount) * 100)
        : 0

      metrics.failedPayments = {
        count: currentFailed,
        trend: failedTrend > 0 ? `+${failedTrend}%` : failedTrend < 0 ? `${failedTrend}%` : 'Same',
        trendDirection: failedTrend > 0 ? 'up' : failedTrend < 0 ? 'down' : 'flat',
        period: `Last ${period}`
      }
    }

    // 4. Active Sessions (logged in users)
    const { data: sessions, error: sessError } = await supabase
      .from('profiles')
      .select('id, last_sign_in_at')
      .gte('last_sign_in_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour

    if (!sessError && sessions) {
      metrics.activeSessions = {
        count: sessions.length,
        period: 'Last hour'
      }
    }

    // 5. API Response Times (from metrics table)
    const { data: apiMetrics, error: apiError } = await supabase
      .from('application_metrics')
      .select('metric_value')
      .eq('metric_name', 'api.response_time')
      .gte('recorded_at', since)

    if (!apiError && apiMetrics && apiMetrics.length > 0) {
      const times = apiMetrics.map(m => Number(m.metric_value))
      const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      const p95Time = Math.round(percentile(times, 95))

      metrics.apiPerformance = {
        average: avgTime,
        p95: p95Time,
        count: times.length,
        period: `Last ${period}`
      }
    }

    // 6. Error Rate (from metrics table)
    const { data: errorMetrics, error: errError } = await supabase
      .from('application_metrics')
      .select('metric_value, recorded_at')
      .eq('metric_name', 'error.occurred')
      .gte('recorded_at', since)

    if (!errError && errorMetrics) {
      const errorCount = errorMetrics.length
      const totalRequests = (registrations?.length || 0) + (apiMetrics?.length || 100)
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0

      // Previous period comparison
      const previousSince = new Date(Date.now() - 2 * hours * 60 * 60 * 1000).toISOString()
      const { data: previousErrors } = await supabase
        .from('application_metrics')
        .select('id')
        .eq('metric_name', 'error.occurred')
        .gte('recorded_at', previousSince)
        .lt('recorded_at', since)

      const previousErrorCount = previousErrors?.length || 0
      const errorTrend = previousErrorCount > 0
        ? Math.round(((errorCount - previousErrorCount) / previousErrorCount) * 100)
        : 0

      const sparkline = generateSparkline(errorMetrics, 'recorded_at', hours)

      metrics.errors = {
        count: errorCount,
        rate: errorRate.toFixed(2) + '%',
        trend: errorTrend > 0 ? `+${errorTrend}%` : `${errorTrend}%`,
        trendDirection: errorTrend > 0 ? 'up' : errorTrend < 0 ? 'down' : 'flat',
        sparkline,
        period: `Last ${period}`
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      period,
      metrics
    })

  } catch (error: any) {
    console.error('[Monitoring] Failed to fetch metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error.message },
      { status: 500 }
    )
  }
}

// Helper: Generate sparkline data (simple hourly buckets)
function generateSparkline(data: any[], timeField: string, hours: number): number[] {
  if (!data || data.length === 0) return []

  const buckets = Math.min(hours, 24) // Max 24 data points
  const bucketSize = hours / buckets
  const sparkline: number[] = new Array(buckets).fill(0)

  data.forEach(item => {
    const age = (Date.now() - new Date(item[timeField]).getTime()) / (1000 * 60 * 60)
    const bucketIndex = Math.floor(age / bucketSize)
    if (bucketIndex >= 0 && bucketIndex < buckets) {
      sparkline[buckets - 1 - bucketIndex]++
    }
  })

  return sparkline
}

// Helper: Generate revenue sparkline
function generateRevenueSparkline(data: any[], timeField: string, hours: number): number[] {
  if (!data || data.length === 0) return []

  const buckets = Math.min(hours, 24)
  const bucketSize = hours / buckets
  const sparkline: number[] = new Array(buckets).fill(0)

  data.forEach(item => {
    const age = (Date.now() - new Date(item[timeField]).getTime()) / (1000 * 60 * 60)
    const bucketIndex = Math.floor(age / bucketSize)
    if (bucketIndex >= 0 && bucketIndex < buckets) {
      sparkline[buckets - 1 - bucketIndex] += Number(item.amount_paid) || 0
    }
  })

  // Convert cents to dollars
  return sparkline.map(v => Math.round(v / 100))
}

// Helper: Calculate percentile
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}
