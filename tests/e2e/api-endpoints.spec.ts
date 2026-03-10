import { test, expect } from '@playwright/test'

test.describe('API Endpoint Validation', () => {
  test.describe('POST /api/checkout', () => {
    test('should reject invalid UUID', async ({ request }) => {
      const response = await request.post('/api/checkout', {
        data: {
          orderId: 'not-a-uuid',
          amount: 100,
          clubSlug: 'test',
        },
      })

      expect(response.status()).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Validation')
      expect(data.validationErrors).toBeDefined()
      expect(data.validationErrors[0].field).toBe('orderId')
    })

    test('should reject negative amount', async ({ request }) => {
      const response = await request.post('/api/checkout', {
        data: {
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          amount: -100,
          clubSlug: 'test',
        },
      })

      expect(response.status()).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Validation')
    })

    test('should reject missing fields', async ({ request }) => {
      const response = await request.post('/api/checkout', {
        data: {
          orderId: '550e8400-e29b-41d4-a716-446655440000',
        },
      })

      expect(response.status()).toBe(400)
    })
  })

  test.describe('POST /api/athletes/create', () => {
    test('should reject invalid household ID', async ({ request }) => {
      const response = await request.post('/api/athletes/create', {
        data: {
          firstName: 'John',
          lastName: 'Doe',
          householdId: 'not-uuid',
        },
      })

      expect(response.status()).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Validation')
    })

    test('should reject empty name', async ({ request }) => {
      const response = await request.post('/api/athletes/create', {
        data: {
          firstName: '',
          lastName: 'Doe',
          householdId: '550e8400-e29b-41d4-a716-446655440000',
        },
      })

      expect(response.status()).toBe(400)
    })

    test('should reject names over 100 chars', async ({ request }) => {
      const response = await request.post('/api/athletes/create', {
        data: {
          firstName: 'a'.repeat(101),
          lastName: 'Doe',
          householdId: '550e8400-e29b-41d4-a716-446655440000',
        },
      })

      expect(response.status()).toBe(400)
    })
  })

  test.describe('POST /api/household-guardians/invite', () => {
    test('should reject invalid email', async ({ request }) => {
      const response = await request.post('/api/household-guardians/invite', {
        data: {
          email: 'not-an-email',
          householdId: '550e8400-e29b-41d4-a716-446655440000',
        },
      })

      expect(response.status()).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Validation')
      expect(data.validationErrors[0].field).toContain('email')
    })
  })

  test.describe('POST /api/auth/setup-password', () => {
    test('should reject short password', async ({ request }) => {
      const response = await request.post('/api/auth/setup-password', {
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          password: 'short',
          token: 'valid-token-here',
        },
      })

      expect(response.status()).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Validation')
      expect(data.validationErrors[0].message).toContain('at least 8')
    })

    test('should reject invalid userId format', async ({ request }) => {
      const response = await request.post('/api/auth/setup-password', {
        data: {
          userId: 'not-uuid',
          password: 'securepassword',
          token: 'valid-token',
        },
      })

      expect(response.status()).toBe(400)
    })
  })

  test.describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in UUID fields', async ({ request }) => {
      const sqlInjection = "1' OR '1'='1"
      
      const response = await request.post('/api/checkout', {
        data: {
          orderId: sqlInjection,
          amount: 100,
          clubSlug: 'test',
        },
      })

      expect(response.status()).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Validation')
    })

    test('should prevent SQL injection in email fields', async ({ request }) => {
      const sqlInjection = "admin'--@example.com"
      
      const response = await request.post('/api/household-guardians/invite', {
        data: {
          email: sqlInjection,
          householdId: '550e8400-e29b-41d4-a716-446655440000',
        },
      })

      expect(response.status()).toBe(400)
    })
  })

  test.describe('Rate Limiting', () => {
    test('should rate limit checkout endpoint', async ({ request }) => {
      const validData = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        clubSlug: 'test',
      }

      // Make 11 requests quickly (limit is 10/min)
      const requests = Array.from({ length: 11 }, () =>
        request.post('/api/checkout', { data: validData })
      )

      const responses = await Promise.all(requests)
      
      // At least one should be rate limited (429)
      const rateLimited = responses.some(r => r.status() === 429)
      expect(rateLimited).toBeTruthy()
    })
  })

  test.describe('Authentication', () => {
    test('should require authentication for protected endpoints', async ({ request }) => {
      const response = await request.get('/api/admin/athletes/summary')
      
      expect(response.status()).toBe(401)
      const data = await response.json()
      expect(data.error).toContain('Unauthorized')
    })
  })
})
