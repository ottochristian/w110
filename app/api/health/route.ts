import { NextResponse } from 'next/server'
import { getEnvConfig, isFeatureEnabled } from '@/lib/env-validation'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * Health check endpoint for load balancers and monitoring
 * Returns 200 if app is healthy, 503 if unhealthy
 */
export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {}
  let isHealthy = true

  // 1. Check environment variables
  try {
    getEnvConfig()
    checks.environment = { status: 'ok' }
  } catch (error) {
    checks.environment = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Environment validation failed',
    }
    isHealthy = false
  }

  // 2. Check database connectivity
  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from('clubs').select('id').limit(1).single()
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows found" which is fine for health check
      throw error
    }
    
    checks.database = { status: 'ok' }
  } catch (error) {
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database connection failed',
    }
    isHealthy = false
  }

  // 3. Check Stripe API key
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey || !stripeKey.startsWith('sk_')) {
      throw new Error('Invalid Stripe key')
    }
    checks.stripe = { status: 'ok' }
  } catch (error) {
    checks.stripe = {
      status: 'error',
      message: 'Stripe configuration invalid',
    }
    isHealthy = false
  }

  // 4. Feature flags
  const features = {
    email: isFeatureEnabled('email'),
    sms: isFeatureEnabled('sms'),
    sentry: isFeatureEnabled('sentry'),
  }

  const response = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
    features,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
  }

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
  })
}






