import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createSessionSchema } from '@/lib/validation'
import { z } from 'zod'

/**
 * Create a session for a user after email verification
 * Uses Supabase Admin API to generate session tokens
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    let validatedData
    try {
      const body = await request.json()
      validatedData = createSessionSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            validationErrors: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        )
      }
      throw error
    }

    const { userId, verificationToken } = validatedData

    const supabaseAdmin = createAdminClient()

    // Get user's email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (userError || !userData.user) {
      console.error('Error fetching user:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate a magic link for the user
    // This creates a proper session token that can be verified
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
    })

    if (linkError || !linkData) {
      console.error('Error generating magic link:', linkError)
      return NextResponse.json(
        { error: 'Failed to generate session' },
        { status: 500 }
      )
    }

    // Extract the hashed token from the action link
    const url = new URL(linkData.properties.action_link)
    const tokenHash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type')

    if (!tokenHash || !type) {
      console.error('Missing token_hash or type in generated link')
      return NextResponse.json(
        { error: 'Failed to extract session token' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tokenHash,
      type
    })
  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
