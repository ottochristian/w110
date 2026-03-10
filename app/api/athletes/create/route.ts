import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { log } from '@/lib/logger'
import { uuidSchema, nameSchema, dateStringSchema, emailSchema, phoneSchema, ValidationError } from '@/lib/validation'
import { z } from 'zod'

/**
 * API route to create athletes for parent accounts
 * Uses admin client to bypass RLS, but verifies user owns the household
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      log.warn('Authentication failed in create athlete API', {
        status: authResult.status,
      })
      return authResult
    }

    const { user } = authResult
    log.info('User authenticated for athlete creation', { userId: user.id })
    const adminSupabase = createSupabaseAdminClient()

    // 2. Parse and validate request body
    const athleteRequestSchema = z.object({
      athlete: z.object({
        first_name: nameSchema,
        last_name: nameSchema,
        date_of_birth: dateStringSchema,
        email: emailSchema.optional(),
        phone: phoneSchema.optional(),
      }),
      clubId: uuidSchema,
      householdId: uuidSchema,
    })

    let validatedData
    try {
      const body = await request.json()
      validatedData = athleteRequestSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        log.warn('Athlete creation validation failed', { errors: error.errors })
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

    const { athlete, clubId, householdId } = validatedData

    // 3. Verify user is linked to the household

    const { data: householdGuardian } = await adminSupabase
      .from('household_guardians')
      .select('household_id')
      .eq('user_id', user.id)
      .eq('household_id', householdId)
      .maybeSingle()

    if (!householdGuardian) {
      log.warn('User attempted to create athlete without household link', {
        userId: user.id,
        householdId,
      })
      return NextResponse.json(
        { error: 'You are not authorized to create athletes for this household.' },
        { status: 403 }
      )
    }

    // 4. Verify club_id matches user's club (or athlete's club matches)
    const athleteClubId = athlete.club_id || clubId
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .single()

    if (profile?.club_id && athleteClubId !== profile.club_id) {
      log.warn('User attempted to create athlete in different club', {
        userId: user.id,
        userClubId: profile.club_id,
        athleteClubId,
      })
      return NextResponse.json(
        { error: 'You can only create athletes in your own club.' },
        { status: 403 }
      )
    }

    // 5. Prepare athlete data
    const athleteData: any = {
      ...athlete,
      club_id: athleteClubId,
      household_id: householdId,
    }
    
    // Ensure family_id is not set (it's been removed from schema) - already handled above

    // 6. Create athlete (using admin client to bypass RLS)
    const { data: createdAthlete, error: createError } = await adminSupabase
      .from('athletes')
      .insert([athleteData])
      .select()
      .single()

    if (createError || !createdAthlete) {
      log.error('Error creating athlete', createError, {
        userId: user.id,
        athleteData,
      })
      return NextResponse.json(
        { error: createError?.message || 'Failed to create athlete' },
        { status: 500 }
      )
    }

    log.info('Athlete created successfully', {
      userId: user.id,
      athleteId: createdAthlete.id,
    })

    return NextResponse.json({ athlete: createdAthlete }, { status: 201 })
  } catch (err) {
    log.error('Error in create athlete API', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}




