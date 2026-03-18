/**
 * Sentry utility functions for error tracking
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Capture an exception with context
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    })
  } else {
    console.error('Sentry not configured. Error:', error, 'Context:', context)
  }
}

/**
 * Capture a message with severity
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    })
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`, context)
  }
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; role?: string }) {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      role: user.role,
      // Don't send email in production for privacy
    })
  }
}

/**
 * Clear user context
 */
export function clearUser() {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser(null)
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
) {
  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
    })
  }
}

/**
 * Start a transaction for performance monitoring
 * Note: Sentry v8+ uses startSpan instead of startTransaction
 */
export function startTransaction(name: string, op: string) {
  if (process.env.SENTRY_DSN) {
    // startTransaction was removed in Sentry v8; return a no-op object for compatibility
    return { name, op, finish: () => {} }
  }
  return null
}

/**
 * Wrap async function with error capture
 */
export function withErrorCapture<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: Record<string, unknown>
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      if (error instanceof Error) {
        captureException(error, context)
      }
      throw error
    }
  }) as T
}
