import { describe, it, expect } from 'vitest'
import {
  uuidSchema,
  emailSchema,
  nameSchema,
  phoneSchema,
  checkoutSchema,
  createAthleteSchema,
  inviteGuardianSchema,
  setupPasswordSchema,
  completeInvitationSchema,
} from '@/lib/validation'
import { z } from 'zod'

describe('Validation Schemas', () => {
  describe('Basic Schemas', () => {
    describe('uuidSchema', () => {
      it('should accept valid UUID', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000'
        expect(uuidSchema.parse(uuid)).toBe(uuid)
      })

      it('should reject invalid UUID', () => {
        expect(() => uuidSchema.parse('not-a-uuid')).toThrow()
        expect(() => uuidSchema.parse('')).toThrow()
        expect(() => uuidSchema.parse('123')).toThrow()
      })
    })

    describe('emailSchema', () => {
      it('should accept valid email', () => {
        expect(emailSchema.parse('user@example.com')).toBe('user@example.com')
      })

      it('should lowercase emails', () => {
        expect(emailSchema.parse('USER@EXAMPLE.COM')).toBe('user@example.com')
      })

      it('should reject invalid emails', () => {
        expect(() => emailSchema.parse('not-an-email')).toThrow()
        expect(() => emailSchema.parse('missing@')).toThrow()
        expect(() => emailSchema.parse('@domain.com')).toThrow()
      })
    })

    describe('nameSchema', () => {
      it('should accept valid names', () => {
        expect(nameSchema.parse('John Doe')).toBe('John Doe')
      })

      it('should trim whitespace', () => {
        expect(nameSchema.parse('  John  ')).toBe('John')
      })

      it('should reject empty strings', () => {
        expect(() => nameSchema.parse('')).toThrow()
      })

      it('should reject names over 100 chars', () => {
        const longName = 'a'.repeat(101)
        expect(() => nameSchema.parse(longName)).toThrow()
      })
    })

    describe('phoneSchema', () => {
      it('should accept valid E.164 phone numbers', () => {
        expect(phoneSchema.parse('+12025551234')).toBe('+12025551234')
      })

      it('should reject invalid phone numbers', () => {
        expect(() => phoneSchema.parse('123')).toThrow()
        expect(() => phoneSchema.parse('abc')).toThrow()
        expect(() => phoneSchema.parse('+0123456789')).toThrow() // Can't start with 0
      })
    })
  })

  describe('Complex Schemas', () => {
    describe('checkoutSchema', () => {
      it('should validate valid checkout data', () => {
        const validData = {
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 100,
          clubSlug: 'test-club',
        }
        expect(checkoutSchema.parse(validData)).toEqual(validData)
      })

      it('should reject invalid orderId', () => {
        const invalidData = {
          orderId: 'not-uuid',
          amount: 100,
          clubSlug: 'test-club',
        }
        expect(() => checkoutSchema.parse(invalidData)).toThrow()
      })

      it('should reject negative amounts', () => {
        const invalidData = {
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          amount: -100,
          clubSlug: 'test-club',
        }
        expect(() => checkoutSchema.parse(invalidData)).toThrow()
      })

      it('should reject missing fields', () => {
        const invalidData = {
          orderId: '550e8400-e29b-41d4-a716-446655440000',
        }
        expect(() => checkoutSchema.parse(invalidData)).toThrow()
      })
    })

    describe('createAthleteSchema', () => {
      it('should validate valid athlete data', () => {
        const validData = {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '2010-01-01',
          householdId: '550e8400-e29b-41d4-a716-446655440000',
          clubId: '550e8400-e29b-41d4-a716-446655440000',
        }
        const result = createAthleteSchema.parse(validData)
        expect(result.firstName).toBe('John')
        expect(result.lastName).toBe('Doe')
      })

      it('should accept dateOfBirth in YYYY-MM-DD format', () => {
        const validData = {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '2010-05-15',  // YYYY-MM-DD format
          householdId: '550e8400-e29b-41d4-a716-446655440000',
          clubId: '550e8400-e29b-41d4-a716-446655440000',
        }
        expect(createAthleteSchema.parse(validData)).toBeTruthy()
      })

      it('should reject invalid householdId', () => {
        const invalidData = {
          firstName: 'John',
          lastName: 'Doe',
          householdId: 'not-uuid',
        }
        expect(() => createAthleteSchema.parse(invalidData)).toThrow()
      })
    })

    describe('inviteGuardianSchema', () => {
      it('should validate valid invitation', () => {
        const validData = {
          email: 'parent@example.com',
          householdId: '550e8400-e29b-41d4-a716-446655440000',
          role: 'primary',
        }
        const result = inviteGuardianSchema.parse(validData)
        expect(result.email).toBe('parent@example.com')
      })

      it('should lowercase email', () => {
        const data = {
          email: 'PARENT@EXAMPLE.COM',
          householdId: '550e8400-e29b-41d4-a716-446655440000',
          role: 'primary',
        }
        const result = inviteGuardianSchema.parse(data)
        expect(result.email).toBe('parent@example.com')
      })
    })

    describe('setupPasswordSchema', () => {
      it('should validate valid password setup', () => {
        const validData = {
          token: 'valid-token-here',
          password: 'securepassword123',
          userId: '550e8400-e29b-41d4-a716-446655440000',
        }
        expect(setupPasswordSchema.parse(validData)).toBeTruthy()
      })

      it('should reject short passwords', () => {
        const invalidData = {
          token: 'valid-token',
          password: 'short',
          userId: '550e8400-e29b-41d4-a716-446655440000',
        }
        expect(() => setupPasswordSchema.parse(invalidData)).toThrow()
      })

      it('should reject passwords over 100 chars', () => {
        const invalidData = {
          token: 'valid-token',
          password: 'a'.repeat(101),
          userId: '550e8400-e29b-41d4-a716-446655440000',
        }
        expect(() => setupPasswordSchema.parse(invalidData)).toThrow()
      })

      it('should reject short token', () => {
        const invalidData = {
          token: 'short',
          password: 'securepassword',
          userId: '550e8400-e29b-41d4-a716-446655440000',
        }
        expect(() => setupPasswordSchema.parse(invalidData)).toThrow()
      })
    })

    describe('completeInvitationSchema', () => {
      it('should validate complete invitation signup', () => {
        const validData = {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          clubId: '550e8400-e29b-41d4-a716-446655440000',
        }
        const result = completeInvitationSchema.parse(validData)
        expect(result.email).toBe('user@example.com')
      })

      it('should work with optional fields', () => {
        const validData = {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          clubId: '550e8400-e29b-41d4-a716-446655440000',
          phone: '+12025551234',
          addressLine1: '123 Main St',
          city: 'Boston',
          state: 'MA',
          zipCode: '02101',
        }
        expect(completeInvitationSchema.parse(validData)).toBeTruthy()
      })

      it('should reject invalid phone format', () => {
        const invalidData = {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          clubId: '550e8400-e29b-41d4-a716-446655440000',
          phone: 'invalid-phone',
        }
        expect(() => completeInvitationSchema.parse(invalidData)).toThrow()
      })
    })
  })

  describe('SQL Injection Prevention', () => {
    it('should reject SQL injection attempts in UUID fields', () => {
      const sqlInjection = "1' OR '1'='1"
      expect(() => uuidSchema.parse(sqlInjection)).toThrow()
    })

    it('should reject SQL injection in email fields', () => {
      const sqlInjection = "admin'--"
      expect(() => emailSchema.parse(sqlInjection)).toThrow()
    })
  })

  describe('XSS Prevention', () => {
    it('should reject XSS attempts in name fields', () => {
      const xssAttempt = '<script>alert("xss")</script>'
      // nameSchema now rejects HTML characters
      expect(() => nameSchema.parse(xssAttempt)).toThrow()
    })
  })
})
