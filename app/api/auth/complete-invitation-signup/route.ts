import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'
import { completeInvitationSchema } from '@/lib/validation'
import { z } from 'zod'

/**
 * API route to complete signup for users coming from guardian invitation
 * Skips email verification since email is already verified (they received invitation email)
 * Creates profile and household directly
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    let validatedData
    try {
      const body = await request.json()
      validatedData = completeInvitationSchema.parse(body)
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

    const { userId, email, firstName, lastName, phone, addressLine1, addressLine2, city, state, zipCode, emergencyContactName, emergencyContactPhone, clubId } = validatedData

    const supabase = createAdminClient()

    // STEP 1: Confirm email in Supabase auth (skip OTP verification)
    const { data: updateData, error: confirmError } = await supabase.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    )

    if (confirmError) {
      log.error('Error confirming email for invitation signup', confirmError)
      return NextResponse.json(
        { error: 'Failed to confirm email' },
        { status: 500 }
      )
    }

    // STEP 2: Check/Create Profile
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle()

    if (!existingProfile) {
      // Try using RPC function first (handles edge cases better), fallback to direct insert
      let profileError = null
      let profileCreated = false
      
      try {
        const { error: rpcError } = await supabase.rpc('create_user_profile', {
          p_user_id: userId,
          p_email: email,
          p_first_name: firstName,
          p_last_name: lastName,
          p_role: 'parent',
          p_club_id: clubId,
        })
        
        if (rpcError) {
          profileError = rpcError
        } else {
          profileCreated = true
        }
      } catch (rpcErr) {
        // If RPC fails, try direct insert
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            first_name: firstName,
            last_name: lastName,
            role: 'parent',
            club_id: clubId,
          })
        
        if (insertError) {
          profileError = insertError
        } else {
          profileCreated = true
        }
      }

      if (profileError) {
        log.error('Error creating profile for invitation signup', profileError)
        // Check if it's a duplicate key error (profile already exists)
        if (profileError.code === '23505') {
          // Profile already exists, continue
          log.info('Profile already exists, continuing...')
        } else {
          return NextResponse.json(
            { 
              error: `Failed to create profile: ${profileError.message}`,
              details: profileError.details,
              hint: profileError.hint,
            },
            { status: 500 }
          )
        }
      }
      
      // Verify profile was created (even if no error, RLS might have blocked it)
      if (!profileCreated || profileError?.code === '23505') {
        const { data: verifyProfile, error: verifyError } = await supabase
          .from('profiles')
          .select('id, email, club_id')
          .eq('id', userId)
          .maybeSingle()

        if (!verifyProfile && !verifyError) {
          log.error('Profile creation failed - profile does not exist after insert')
          return NextResponse.json(
            { error: 'Failed to create profile - profile was not created. Please contact support.' },
            { status: 500 }
          )
        }
      }
    }

    // STEP 3: For invitation signups, we DON'T create a household
    // The user will be added to the existing household when they accept the invitation
    // The accept invitation API route will handle adding them to the household_guardians table

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Email verified automatically.',
    })
  } catch (error) {
    log.error('Error completing invitation signup', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

