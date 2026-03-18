import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uuidSchema } from '@/lib/validation'
import { dbRateLimiter } from '@/lib/services/rate-limiter-db'
import { z } from 'zod'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = await dbRateLimiter.checkSetupPasswordByIP(ip)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      )
    }

    // Validate request body
    let validatedData
    try {
      const body = await request.json()
      const schema = z.object({
        userId: uuidSchema,
        password: z.string().min(8, 'Password must be at least 8 characters').max(100),
      })
      validatedData = schema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            validationErrors: error.issues.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        )
      }
      throw error
    }

    const { userId, password } = validatedData

    const supabaseAdmin = getSupabaseAdmin()

    // Set the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    )

    if (updateError) {
      console.error('Error setting password:', updateError)
      return NextResponse.json(
        { error: 'Failed to set password' },
        { status: 500 }
      )
    }

    // Update user metadata to mark invitation as complete
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        invitation_pending: false,
        invitation_completed_at: new Date().toISOString()
      }
    })

    // Update profile to mark email as verified
    await supabaseAdmin
      .from('profiles')
      .update({ email_verified_at: new Date().toISOString() })
      .eq('id', userId)

    return NextResponse.json({
      success: true,
      message: 'Password set successfully'
    })
  } catch (error) {
    console.error('Setup password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
