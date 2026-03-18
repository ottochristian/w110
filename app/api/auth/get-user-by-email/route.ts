import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserByEmailSchema } from '@/lib/validation'
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
    // Rate limiting: 20 attempts per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = await dbRateLimiter.checkGetUserByEmailByIP(ip)
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
      validatedData = getUserByEmailSchema.parse(body)
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

    const { email } = validatedData

    const supabaseAdmin = getSupabaseAdmin()

    // Get user by email from profiles (case-insensitive)
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .ilike('email', email)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'No user found with this email address' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      userId: profile.id
    })
  } catch (error) {
    console.error('Get user by email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
