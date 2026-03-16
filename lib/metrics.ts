/**
 * Metrics Helper Library
 * 
 * Provides easy functions to record application metrics for monitoring.
 * All functions are non-blocking (fire and forget) to avoid impacting performance.
 * Critical errors are also sent to Sentry for real-time alerting.
 */

import { createAdminClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'

export type MetricSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface MetricMetadata {
  [key: string]: any
}

/**
 * Record a metric to the application_metrics table
 * 
 * @param name - Metric name (e.g., 'registration.created', 'payment.failed')
 * @param value - Numeric value of the metric
 * @param metadata - Optional additional context
 * @param severity - Severity level (default: 'info')
 * 
 * @example
 * await recordMetric('registration.created', 1, { club_id: '123', program_id: '456' })
 * await recordMetric('api.response_time', 234, { endpoint: '/api/health' })
 * await recordMetric('payment.failed', 1, { error: 'card_declined' }, 'error')
 */
export async function recordMetric(
  name: string,
  value: number,
  metadata?: MetricMetadata,
  severity: MetricSeverity = 'info'
): Promise<void> {
  try {
    // Use admin client - RLS only allows service_role to INSERT
    const supabase = createAdminClient()

    await supabase.from('application_metrics').insert({
      metric_name: name,
      metric_value: value,
      metadata: metadata || {},
      severity
    })

    // Also send critical/error events to Sentry for real-time alerting
    if (severity === 'critical' || severity === 'error') {
      Sentry.captureMessage(`Metric Alert: ${name}`, {
        level: severity === 'critical' ? 'error' : 'warning',
        extra: { 
          metric_name: name,
          metric_value: value, 
          metadata 
        },
        tags: {
          metric_type: 'business',
          severity
        }
      })
    }
  } catch (error) {
    // Log but don't throw - metrics should never break the app
    console.error('[Metrics] Failed to record metric:', { name, value, error })
    
    // Send the metric failure to Sentry
    Sentry.captureException(error, {
      tags: { 
        source: 'metrics',
        metric_name: name 
      },
      extra: { value, metadata }
    })
  }
}

/**
 * Track API call performance (fire-and-forget, non-blocking)
 * Records to application_metrics for monitoring dashboard
 * 
 * @param endpoint - API endpoint path (e.g. request.nextUrl.pathname)
 * @param duration - Duration in milliseconds
 * @param statusCode - HTTP status code
 * @param metadata - Additional context
 * 
 * @example
 * const start = Date.now()
 * // ... handler logic ...
 * trackApiCall(request.nextUrl.pathname, Date.now() - start, 200)
 * return response
 */
export function trackApiCall(
  endpoint: string,
  duration: number,
  statusCode: number,
  metadata?: MetricMetadata
): Promise<void> {
  const severity: MetricSeverity = 
    duration > 5000 ? 'error' :
    duration > 2000 ? 'warning' :
    'info'

  // Fire-and-forget - don't block the response
  recordMetric(
    'api.response_time',
    duration,
    {
      endpoint,
      statusCode,
      ...metadata
    },
    severity
  ).catch(() => {})
}

/**
 * Track error occurrence
 * Records error metrics and sends to Sentry
 * 
 * @param source - Where the error occurred (e.g., 'payment_flow', 'registration')
 * @param error - The error object
 * @param metadata - Additional context
 * 
 * @example
 * await trackError('payment_flow', new Error('Card declined'), { user_id: '123' })
 */
export async function trackError(
  source: string,
  error: Error,
  metadata?: MetricMetadata
): Promise<void> {
  await recordMetric(
    'error.occurred',
    1,
    {
      source,
      message: error.message,
      stack: error.stack,
      ...metadata
    },
    'error'
  )

  // Also send to Sentry with full context
  Sentry.captureException(error, {
    tags: { source },
    extra: metadata
  })
}

/**
 * Track business event (registration, payment, etc.)
 * 
 * @param eventType - Type of event (e.g., 'registration', 'payment')
 * @param action - Action taken (e.g., 'created', 'succeeded', 'failed')
 * @param metadata - Additional context
 * 
 * @example
 * await trackBusinessEvent('registration', 'created', { club_id: '123', amount: 100 })
 * await trackBusinessEvent('payment', 'succeeded', { amount: 150, method: 'card' })
 */
export async function trackBusinessEvent(
  eventType: string,
  action: string,
  metadata?: MetricMetadata
): Promise<void> {
  await recordMetric(
    `${eventType}.${action}`,
    1,
    metadata,
    'info'
  )
}

/**
 * Track webhook event
 * 
 * @param event_type - Webhook event type (e.g., 'payment_intent.succeeded')
 * @param success - Whether the webhook was processed successfully
 * @param metadata - Additional context
 * 
 * @example
 * await trackWebhook('payment_intent.succeeded', true, { payment_id: 'pi_123' })
 */
export async function trackWebhook(
  event_type: string,
  success: boolean,
  metadata?: MetricMetadata
): Promise<void> {
  await recordMetric(
    success ? 'webhook.succeeded' : 'webhook.failed',
    1,
    {
      event_type,
      ...metadata
    },
    success ? 'info' : 'warning'
  )
}

/**
 * Track email delivery
 * 
 * @param success - Whether email was sent successfully
 * @param type - Email type (e.g., 'welcome', 'invoice', 'password_reset')
 * @param metadata - Additional context
 * 
 * @example
 * await trackEmail(true, 'welcome', { to: 'user@example.com' })
 */
export async function trackEmail(
  success: boolean,
  type: string,
  metadata?: MetricMetadata
): Promise<void> {
  await recordMetric(
    success ? 'email.sent' : 'email.failed',
    1,
    {
      type,
      ...metadata
    },
    success ? 'info' : 'warning'
  )
}

/**
 * Track SMS delivery
 * 
 * @param success - Whether SMS was sent successfully
 * @param metadata - Additional context
 * 
 * @example
 * await trackSMS(true, { to: '+1234567890', cost: 0.05 })
 */
export async function trackSMS(
  success: boolean,
  metadata?: MetricMetadata
): Promise<void> {
  await recordMetric(
    success ? 'sms.sent' : 'sms.failed',
    1,
    metadata,
    success ? 'info' : 'warning'
  )
}

/**
 * Get metrics summary for the last 24 hours
 * 
 * @param metricName - Optional metric name to filter by
 * @returns Array of metric summaries
 * 
 * @example
 * const metrics = await getMetricsSummary()
 * const paymentMetrics = await getMetricsSummary('payment.succeeded')
 */
export async function getMetricsSummary(metricName?: string) {
  try {
    const supabase = createClient()
    
    let query = supabase
      .from('application_metrics')
      .select('metric_name, metric_value, metadata, recorded_at, severity')
      .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false })
      .limit(1000)

    if (metricName) {
      query = query.eq('metric_name', metricName)
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[Metrics] Failed to fetch metrics summary:', error)
    return []
  }
}

/**
 * Get metrics aggregated by name (last 24 hours)
 * 
 * @returns Map of metric names to aggregated data
 */
export async function getAggregatedMetrics() {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('metrics_last_24h')
      .select('*')

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[Metrics] Failed to fetch aggregated metrics:', error)
    return []
  }
}
