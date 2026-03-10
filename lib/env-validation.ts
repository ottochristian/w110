/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 * Fails fast with clear error messages instead of runtime crashes
 */

export interface EnvConfig {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  
  // Stripe
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string
  
  // App
  NEXT_PUBLIC_APP_URL: string
  NODE_ENV: 'development' | 'production' | 'test'
  
  // Optional but recommended
  SENDGRID_API_KEY?: string
  TWILIO_ACCOUNT_SID?: string
  TWILIO_AUTH_TOKEN?: string
  TWILIO_PHONE_NUMBER?: string
  SENTRY_DSN?: string
}

class EnvironmentValidationError extends Error {
  constructor(message: string, public missingVars: string[]) {
    super(message)
    this.name = 'EnvironmentValidationError'
  }
}

/**
 * Validate required environment variables
 * Throws EnvironmentValidationError if any required vars are missing
 */
export function validateEnvironment(): EnvConfig {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_APP_URL',
  ]
  
  const missing: string[] = []
  const warnings: string[] = []
  
  // Check required variables
  for (const varName of required) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      missing.push(varName)
    }
  }
  
  // Check optional but recommended variables
  const recommended = {
    SENDGRID_API_KEY: 'Email notifications',
    TWILIO_ACCOUNT_SID: 'SMS notifications',
    TWILIO_AUTH_TOKEN: 'SMS notifications',
    TWILIO_PHONE_NUMBER: 'SMS notifications',
    SENTRY_DSN: 'Error monitoring',
  }
  
  for (const [varName, feature] of Object.entries(recommended)) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      warnings.push(`${varName} not set (${feature} disabled)`)
    }
  }
  
  // If any required vars are missing, throw error
  if (missing.length > 0) {
    const errorMessage = [
      '❌ Environment validation failed!',
      '',
      'Missing required environment variables:',
      ...missing.map((v) => `  - ${v}`),
      '',
      'Please set these variables in your .env.local file.',
      'See .env.example for reference.',
    ].join('\n')
    
    throw new EnvironmentValidationError(errorMessage, missing)
  }
  
  // Log warnings for recommended variables
  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('\n⚠️  Environment warnings:')
    warnings.forEach((w) => console.warn(`   ${w}`))
    console.warn('')
  }
  
  // Validate URL formats
  try {
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    new URL(process.env.NEXT_PUBLIC_APP_URL!)
  } catch (error) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_APP_URL is not a valid URL')
  }
  
  // Validate Stripe keys format
  if (!process.env.STRIPE_SECRET_KEY!.startsWith('sk_')) {
    throw new Error('STRIPE_SECRET_KEY must start with sk_')
  }
  
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!.startsWith('pk_')) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_')
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET!.startsWith('whsec_')) {
    throw new Error('STRIPE_WEBHOOK_SECRET must start with whsec_')
  }
  
  // Success! Return typed config
  if (process.env.NODE_ENV !== 'test') {
    console.log('✅ Environment validation passed')
    if (process.env.NODE_ENV === 'development') {
      console.log(`   App URL: ${process.env.NEXT_PUBLIC_APP_URL}`)
      console.log(`   Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
      console.log(`   Stripe mode: ${process.env.STRIPE_SECRET_KEY!.includes('test') ? 'TEST' : 'LIVE'}`)
    }
  }
  
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    SENTRY_DSN: process.env.SENTRY_DSN,
  }
}

/**
 * Get validated environment config
 * Safe to call multiple times (caches result)
 */
let cachedConfig: EnvConfig | null = null

export function getEnvConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnvironment()
  }
  return cachedConfig
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test'
}

/**
 * Get app base URL
 */
export function getAppUrl(): string {
  return getEnvConfig().NEXT_PUBLIC_APP_URL
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof featureFlags): boolean {
  const config = getEnvConfig()
  
  switch (feature) {
    case 'email':
      return !!config.SENDGRID_API_KEY
    case 'sms':
      return !!(config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN)
    case 'sentry':
      return !!config.SENTRY_DSN
    default:
      return false
  }
}

const featureFlags = {
  email: 'Email notifications',
  sms: 'SMS notifications',
  sentry: 'Error monitoring',
}

// Validate on module load (server-side only)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  try {
    validateEnvironment()
  } catch (error) {
    if (error instanceof EnvironmentValidationError) {
      console.error(error.message)
      process.exit(1)
    }
    throw error
  }
}
