import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'

/**
 * Performance Indicators Endpoint
 * Returns performance metrics for monitoring dashboard
 * 
 * GET /api/monitoring/performance
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

  const performance: any = {}

  try {
    // 1. Slowest API Endpoints (last hour)
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: apiMetrics, error: apiError } = await supabase
      .from('application_metrics')
      .select('metric_value, metadata')
      .eq('metric_name', 'api.response_time')
      .gte('recorded_at', since)

    if (!apiError && apiMetrics && apiMetrics.length > 0) {
      // Group by endpoint and calculate avg time
      const endpointTimes: { [key: string]: number[] } = {}

      apiMetrics.forEach(m => {
        const endpoint = m.metadata?.endpoint || 'unknown'
        if (!endpointTimes[endpoint]) {
          endpointTimes[endpoint] = []
        }
        endpointTimes[endpoint].push(Number(m.metric_value))
      })

      // Calculate averages and sort
      const slowestEndpoints = Object.entries(endpointTimes)
        .map(([endpoint, times]) => ({
          endpoint,
          avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
          count: times.length,
          maxTime: Math.max(...times)
        }))
        .sort((a, b) => b.avgTime - a.avgTime)
        .slice(0, 5)

      performance.slowestEndpoints = slowestEndpoints
    } else {
      performance.slowestEndpoints = []
    }

    // 2. Database Performance
    const { data: allApiMetrics } = await supabase
      .from('application_metrics')
      .select('metric_value')
      .eq('metric_name', 'api.response_time')
      .gte('recorded_at', since)

    if (allApiMetrics && allApiMetrics.length > 0) {
      const times = allApiMetrics.map(m => Number(m.metric_value))
      const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      const p95Time = Math.round(percentile(times, 95))
      const slowQueries = times.filter(t => t > 500).length

      performance.database = {
        avgQueryTime: avgTime,
        p95QueryTime: p95Time,
        slowQueries,
        totalQueries: times.length
      }
    } else {
      performance.database = {
        avgQueryTime: 0,
        p95QueryTime: 0,
        slowQueries: 0,
        totalQueries: 0
      }
    }

    // 3. Overall API Stats
    const totalApiCalls = apiMetrics?.length || 0
    const avgResponseTime = apiMetrics && apiMetrics.length > 0
      ? Math.round(apiMetrics.reduce((sum, m) => sum + Number(m.metric_value), 0) / apiMetrics.length)
      : 0

    performance.api = {
      totalCalls: totalApiCalls,
      avgResponseTime,
      period: 'Last hour'
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      performance
    })

  } catch (error: any) {
    console.error('[Monitoring] Failed to fetch performance data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance data', details: error.message },
      { status: 500 }
    )
  }
}

// Helper: Calculate percentile
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}
