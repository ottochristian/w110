import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { trackApiCall } from '@/lib/metrics'

/**
 * Sentry Errors Endpoint
 * Fetches recent errors from Sentry API
 * 
 * GET /api/monitoring/errors?limit=20
 * 
 * Requires: System admin authentication
 * 
 * Note: Requires SENTRY_AUTH_TOKEN environment variable
 */
export async function GET(request: NextRequest) {
  const start = Date.now()
  // Require admin authentication
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { profile } = authResult

  // Only system admins can access monitoring
  if (profile.role !== 'system_admin') {
    return NextResponse.json(
      { error: 'Forbidden: System admin access required' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')

  // Check if Sentry auth token is configured
  if (!process.env.SENTRY_AUTH_TOKEN) {
    return NextResponse.json({
      configured: false,
      message: 'Sentry API integration not configured',
      instructions: {
        step1: 'Get auth token from https://sentry.io/settings/auth-tokens/',
        step2: 'Add SENTRY_AUTH_TOKEN to .env.local',
        step3: 'Restart server'
      },
      errors: []
    })
  }

  try {
    // Fetch issues from Sentry API
    const sentryOrg = process.env.SENTRY_ORG || 'skiadmin-9z'
    const sentryProject = process.env.SENTRY_PROJECT || 'javascript-nextjs'
    const sentryUrl = `https://sentry.io/api/0/projects/${sentryOrg}/${sentryProject}/issues/?limit=${limit}&statsPeriod=24h`
    
    const sentryResponse = await fetch(sentryUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.SENTRY_AUTH_TOKEN}`
      }
    })

    if (!sentryResponse.ok) {
      return NextResponse.json({
        configured: true,
        error: `Sentry API returned ${sentryResponse.status}`,
        message: sentryResponse.status === 401 
          ? 'Invalid SENTRY_AUTH_TOKEN' 
          : 'Failed to fetch from Sentry',
        errors: []
      })
    }

    const sentryIssues = await sentryResponse.json()

    // Transform Sentry issues to our format
    interface SentryIssue {
      id: string
      title: string
      culprit?: string
      metadata?: { value?: string }
      level: string
      count: number
      userCount: number
      firstSeen: string
      lastSeen: string
      status: string
      permalink: string
      project?: { name: string }
    }
    const errors = (sentryIssues as SentryIssue[]).map((issue) => ({
      id: issue.id,
      title: issue.title,
      message: issue.culprit || issue.metadata?.value || '',
      level: issue.level,
      count: issue.count,
      userCount: issue.userCount,
      firstSeen: issue.firstSeen,
      lastSeen: issue.lastSeen,
      status: issue.status,
      permalink: issue.permalink,
      project: issue.project?.name,
      severity: mapSentryLevelToSeverity(issue.level)
    }))

    const jsonResponse = NextResponse.json({
      configured: true,
      timestamp: new Date().toISOString(),
      count: errors.length,
      errors
    })
    trackApiCall(request.nextUrl.pathname, Date.now() - start, 200)
    return jsonResponse

  } catch (error: unknown) {
    console.error('[Monitoring] Failed to fetch Sentry errors:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({
      configured: true,
      error: 'Failed to fetch errors',
      details: message,
      errors: []
    }, { status: 500 })
  }
}

function mapSentryLevelToSeverity(level: string): 'critical' | 'error' | 'warning' | 'info' {
  switch (level) {
    case 'fatal':
      return 'critical'
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    default:
      return 'info'
  }
}
