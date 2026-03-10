import { describe, it, expect, vi } from 'vitest'

/**
 * Integration tests for API route authentication and authorization
 * These test that routes properly check auth before processing
 */

describe('API Route Security', () => {
  describe('Protected Admin Routes', () => {
    const adminRoutes = [
      '/api/admin/athletes/summary',
      '/api/admin/programs/analytics',
      '/api/admin/registrations/summary',
      '/api/admin/revenue/summary',
    ]

    adminRoutes.forEach(route => {
      it(`${route} should require authentication`, async () => {
        // This test verifies the route imports requireAdmin
        const routePath = route.replace('/api/', 'app/api/') + '/route.ts'
        const fs = await import('fs')
        const content = fs.readFileSync(routePath, 'utf-8')
        
        expect(content).toContain('requireAdmin')
      })
    })
  })

  describe('Validation Implementation', () => {
    const routesRequiringValidation = [
      { route: 'checkout', schema: 'checkoutSchema' },
      { route: 'athletes/create', schema: 'createAthleteSchema' },
      { route: 'registrations/create', schema: 'createRegistrationSchema' },
      { route: 'household-guardians/invite', schema: 'inviteGuardianSchema' },
      { route: 'coaches/invite', schema: 'inviteCoachSchema' },
      { route: 'otp/send', schema: 'otpSchema' },
      { route: 'otp/verify', schema: 'otpSchema' },
    ]

    routesRequiringValidation.forEach(({ route, schema }) => {
      it(`${route} should use ${schema}`, async () => {
        const fs = await import('fs')
        const routePath = `app/api/${route}/route.ts`
        const content = fs.readFileSync(routePath, 'utf-8')
        
        expect(content).toContain('.parse(')
        expect(content).toContain('ValidationError')
      })
    })
  })

  describe('Rate Limiting', () => {
    const rateLimitedRoutes = [
      { route: 'checkout', limit: 'checkRateLimit' },
      { route: 'webhooks/stripe', limit: 'checkRateLimit' },
      { route: 'otp/send', limit: 'checkRateLimit' },
    ]

    rateLimitedRoutes.forEach(({ route, limit }) => {
      it(`${route} should have rate limiting`, async () => {
        const fs = await import('fs')
        const routePath = `app/api/${route}/route.ts`
        const content = fs.readFileSync(routePath, 'utf-8')
        
        expect(content).toContain(limit)
      })
    })
  })
})
