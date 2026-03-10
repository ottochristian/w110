import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Environment Validation', () => {
  describe('Required Variables', () => {
    it('should have all required Supabase variables', () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined()
      expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined()
    })

    it('should have all required Stripe variables', () => {
      expect(process.env.STRIPE_SECRET_KEY).toBeDefined()
      expect(process.env.STRIPE_WEBHOOK_SECRET).toBeDefined()
      expect(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBeDefined()
    })

    it('should have app URL', () => {
      expect(process.env.NEXT_PUBLIC_APP_URL).toBeDefined()
    })
  })

  describe('Variable Format', () => {
    it('should have valid URL format for Supabase', () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      expect(url).toMatch(/^https?:\/\//)
    })

    it('should have valid Stripe key formats', () => {
      const secretKey = process.env.STRIPE_SECRET_KEY
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      
      expect(secretKey).toMatch(/^sk_/)
      expect(webhookSecret).toMatch(/^whsec_/)
      expect(publishableKey).toMatch(/^pk_/)
    })
  })
})
