// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLED_IN_DEV) {
      return null
    }

    // Filter out sensitive headers
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }

    // Filter out sensitive environment variables
    if (event.contexts?.runtime?.env) {
      const sensitiveKeys = [
        'SUPABASE_SERVICE_ROLE_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'SENDGRID_API_KEY',
        'TWILIO_AUTH_TOKEN',
      ]
      
      for (const key of sensitiveKeys) {
        if (event.contexts?.runtime?.env) {
          delete (event.contexts.runtime.env as Record<string, any>)[key]
        }
      }
    }

    // Filter out PII from context
    if (event.contexts?.user) {
      delete event.contexts.user.email
      delete event.contexts.user.ip_address
    }

    return event
  },

  // Ignore common non-critical errors
  ignoreErrors: [
    // Database connection issues (temporary)
    'PGRST',
    
    // Supabase auth errors (expected)
    'AuthSessionMissingError',
    
    // Network errors
    'ECONNREFUSED',
    'ETIMEDOUT',
    
    // Validation errors (expected, not bugs)
    'ValidationError',
  ],
})
