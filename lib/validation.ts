/**
 * Input validation schemas using Zod
 * Protects against injection attacks, malformed data, and invalid inputs
 */

import { z } from 'zod'

// ============================================================================
// PRIMITIVE TYPES
// ============================================================================

/** UUID validation */
export const uuidSchema = z.string().uuid('Invalid UUID format')

/** Email validation */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(3)
  .max(255)
  .toLowerCase()
  .trim()

/** Phone number validation (E.164 format) */
export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number. Must be in E.164 format (e.g., +15555551234)')
  .trim()

/** Club slug validation (URL-safe) */
export const clubSlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Club slug must contain only lowercase letters, numbers, and hyphens')
  .min(2)
  .max(50)
  .trim()

/** Name validation (prevents scripts, allows international characters) */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .regex(/^[^<>{}]*$/, 'Name contains invalid characters')
  .trim()

/** Amount validation (cents) */
export const amountCentsSchema = z
  .number()
  .int('Amount must be a whole number')
  .positive('Amount must be positive')
  .max(100000000, 'Amount too large') // $1M max

/** Amount validation (dollars) */
export const amountDollarsSchema = z
  .number()
  .positive('Amount must be positive')
  .max(1000000, 'Amount too large') // $1M max

/** Date string validation */
export const dateStringSchema = z
  .string()
  .datetime('Invalid date format')
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'))

/** URL validation */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long')

// ============================================================================
// COMMON OBJECTS
// ============================================================================

/** Pagination parameters */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().min(1).max(100).default(50),
})

/** Search query parameters */
export const searchSchema = z.object({
  q: z.string().min(1).max(100).trim().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().min(1).max(100).default(50),
})

// ============================================================================
// ATHLETE SCHEMAS
// ============================================================================

/** Create athlete request */
export const createAthleteSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  dateOfBirth: dateStringSchema,
  clubId: uuidSchema,
  householdId: uuidSchema,
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  emergencyContact: z
    .object({
      name: nameSchema,
      phone: phoneSchema,
      relationship: z.string().max(50),
    })
    .optional(),
})

/** Update athlete request */
export const updateAthleteSchema = createAthleteSchema.partial().extend({
  id: uuidSchema,
})

// ============================================================================
// CHECKOUT SCHEMAS
// ============================================================================

/** Checkout session request */
export const checkoutSchema = z.object({
  orderId: uuidSchema,
  amount: amountDollarsSchema,
  clubSlug: clubSlugSchema,
  successUrl: urlSchema.optional(),
  cancelUrl: urlSchema.optional(),
})

/** Order creation */
export const createOrderSchema = z.object({
  householdId: uuidSchema,
  clubId: uuidSchema,
  items: z
    .array(
      z.object({
        registrationId: uuidSchema,
        amount: amountDollarsSchema,
      })
    )
    .min(1, 'At least one item required'),
})

// ============================================================================
// INVITATION SCHEMAS
// ============================================================================

/** Invite guardian */
export const inviteGuardianSchema = z.object({
  email: emailSchema,
  householdId: uuidSchema,
  role: z.enum(['primary', 'secondary']),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
})

/** Admin invitation */
export const inviteAdminSchema = z.object({
  email: emailSchema,
  clubId: uuidSchema,
  role: z.enum(['admin', 'coach', 'staff']),
  firstName: nameSchema,
  lastName: nameSchema,
})

// ============================================================================
// REGISTRATION SCHEMAS
// ============================================================================

/** Create registration */
export const createRegistrationSchema = z.object({
  athleteId: uuidSchema,
  subProgramId: uuidSchema,
  seasonId: uuidSchema.optional(),
  notes: z.string().max(500).optional(),
})

/** Invite coach */
export const inviteCoachSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  clubId: uuidSchema,
})

/** Accept household guardian invitation */
export const acceptGuardianSchema = z.object({
  token: z.string().min(10).max(500),
  password: z.string().min(8).max(100),
})

/** Resend guardian invitation */
export const resendGuardianSchema = z.object({
  invitationId: uuidSchema,
})

/** System admin invite */
export const systemAdminInviteSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  role: z.enum(['admin', 'system_admin']),
  clubId: uuidSchema.optional(),
})

/** Setup password */
export const setupPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(100),
  userId: uuidSchema,
})

/** Complete invitation signup */
export const completeInvitationSchema = z.object({
  userId: uuidSchema,
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema.optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
  emergencyContactName: nameSchema.optional(),
  emergencyContactPhone: phoneSchema.optional(),
  clubId: uuidSchema,
})

/** Verify setup token */
export const verifySetupTokenSchema = z.object({
  token: z.string().min(10),
})

/** Create session after verification */
export const createSessionSchema = z.object({
  userId: uuidSchema,
  verificationToken: z.string().min(10),
})

/** Get user by email (admin only) */
export const getUserByEmailSchema = z.object({
  email: emailSchema,
})

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

/** Login request */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

/** Signup request */
export const signupSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  firstName: nameSchema,
  lastName: nameSchema,
  clubSlug: clubSlugSchema.optional(),
})

/** OTP verification */
export const otpSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
  userId: uuidSchema,
  type: z.enum(['email_verification', 'phone_verification', 'admin_invitation', 'password_reset', '2fa_login']),
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate and parse request body
 * Returns parsed data or throws validation error
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  request: Request
): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'Validation failed',
        error.errors.map((e: z.ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }
    throw error
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): T {
  const params: Record<string, any> = {}
  
  for (const [key, value] of searchParams.entries()) {
    // Try to parse numbers
    if (!isNaN(Number(value))) {
      params[key] = Number(value)
    } else {
      params[key] = value
    }
  }
  
  return schema.parse(params)
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public errors: Array<{ field: string; message: string }>

  constructor(message: string, errors: Array<{ field: string; message: string }>) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
  }

  toJSON() {
    return {
      error: this.message,
      validationErrors: this.errors,
    }
  }
}

/**
 * Sanitize string input (removes potential XSS)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .trim()
}

/**
 * Sanitize HTML input (for rich text editors)
 * Use a proper library like DOMPurify in production
 */
export function sanitizeHtml(input: string): string {
  // Basic sanitization - in production, use DOMPurify
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/g, '') // Remove event handlers
    .trim()
}

/**
 * Validate and sanitize file upload
 */
export const fileUploadSchema = z.object({
  name: z.string().max(255),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
  type: z.enum([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ]),
})

// ============================================================================
// EXPORTS
// ============================================================================

export type CreateAthleteInput = z.infer<typeof createAthleteSchema>
export type UpdateAthleteInput = z.infer<typeof updateAthleteSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type InviteGuardianInput = z.infer<typeof inviteGuardianSchema>
export type InviteAdminInput = z.infer<typeof inviteAdminSchema>
export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type OTPInput = z.infer<typeof otpSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type SearchInput = z.infer<typeof searchSchema>
export type InviteCoachInput = z.infer<typeof inviteCoachSchema>
export type AcceptGuardianInput = z.infer<typeof acceptGuardianSchema>
export type ResendGuardianInput = z.infer<typeof resendGuardianSchema>
export type SystemAdminInviteInput = z.infer<typeof systemAdminInviteSchema>
