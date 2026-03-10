import { BaseService, handleSupabaseError, QueryResult } from './base-service'
import { getServiceClient } from './service-client'

/**
 * Service for athlete-related database operations
 * PHASE 2: RLS-FIRST APPROACH - RLS handles club filtering automatically
 */
export class AthletesService extends BaseService {
  constructor(supabase = getServiceClient()) {
    super(supabase)
  }

  /**
   * Get all athletes for the authenticated user's club
   * RLS automatically filters by club - no manual filtering needed!
   * Includes registration data for displaying tags
   */
  async getAthletes(): Promise<QueryResult<any[]>> {
    const result = await this.supabase
      .from('athletes')
      .select(`
        *,
        registrations (
          id,
          status,
          payment_status,
          season_id,
          sub_program_id,
          seasons (
            id,
            name,
            is_current
          ),
          sub_programs (
            id,
            name,
            programs (
              id,
              name
            )
          )
        )
      `)
      .order('first_name', { ascending: true })

    return handleSupabaseError(result)
  }

  /**
   * Get athlete by ID
   * RLS ensures user can only access athletes in their club
   */
  async getAthleteById(athleteId: string): Promise<QueryResult<any>> {
    const result = await this.supabase
      .from('athletes')
      .select('*')
      .eq('id', athleteId)
      .single()

    return handleSupabaseError(result)
  }

  /**
   * Get athletes by household ID
   * RLS ensures user can only access athletes in their household
   */
  async getAthletesByHousehold(householdId: string): Promise<QueryResult<any[]>> {
    const result = await this.supabase
      .from('athletes')
      .select('*')
      .eq('household_id', householdId)
      .order('first_name', { ascending: true })

    return handleSupabaseError(result)
  }

  /**
   * Count athletes
   * RLS automatically filters by club
   */
  async countAthletes(): Promise<QueryResult<number>> {
    const result = await this.supabase
      .from('athletes')
      .select('*', { count: 'exact', head: true })

    if (result.error) {
      return {
        data: null,
        error: new Error(result.error.message || 'Failed to count athletes'),
      }
    }

    return {
      data: result.count || 0,
      error: null,
    }
  }

  /**
   * Update athlete by ID
   * RLS ensures user can only update athletes they have access to
   * Note: The supabase client passed to constructor MUST have the authenticated session
   */
  async updateAthlete(athleteId: string, updates: Partial<{
    first_name: string
    last_name: string
    date_of_birth: string
    gender: string
    ussa_number: string | null
    fis_license: string | null
    medical_notes: string | null
  }>): Promise<QueryResult<any>> {
    // First, check athlete data and RLS relationship before update
    const athleteCheck = await this.supabase
      .from('athletes')
      .select('id, household_id, club_id')
      .eq('id', athleteId)
      .maybeSingle()

    // Check current user's auth
    const { data: { user } } = await this.supabase.auth.getUser()
    
    // Check household_guardians relationship if athlete has household_id
    if (athleteCheck.data?.household_id && user?.id) {
      const hgCheck = await this.supabase
        .from('household_guardians')
        .select('*')
        .eq('user_id', user.id)
        .eq('household_id', athleteCheck.data.household_id)
        .maybeSingle()

    }

    // First verify we can read the athlete (for debugging)
    // Then attempt the update
    // Use .update() without .select() first to see if it affects rows
    // If it does, then select the updated row
    const updateResult = await this.supabase
      .from('athletes')
      .update(updates)
      .eq('id', athleteId)

    if (updateResult.error) {
      return handleSupabaseError(updateResult)
    }

    // Now select the updated row
    const result = await this.supabase
      .from('athletes')
      .select()
      .eq('id', athleteId)
      .maybeSingle()

    if (result.error) {
      return handleSupabaseError(result)
    }

    // If no data returned, the update might have succeeded but RLS blocked read-back
    // Or the athlete doesn't exist. Either way, return success since update() didn't error
    if (!result.data) {
      // Verify update actually happened by checking if row exists and can be read
      const verifyResult = await this.supabase
        .from('athletes')
        .select('id, medical_notes')
        .eq('id', athleteId)
        .maybeSingle()
      
      // If we can read it but it's different, update failed silently
      if (verifyResult.data && verifyResult.data.medical_notes !== updates.medical_notes) {
        return {
          data: null,
          error: new Error('Update did not affect any rows - RLS may have blocked the update'),
        }
      }
      
      // If we can read it and it matches, update succeeded but select didn't return it
      if (verifyResult.data && verifyResult.data.medical_notes === updates.medical_notes) {
        return {
          data: verifyResult.data,
          error: null,
        }
      }
      
      // Can't verify - return null data but no error
      return {
        data: null,
        error: null,
      }
    }

    return {
      data: result.data,
      error: null,
    }
  }
}

export const athletesService = new AthletesService(getServiceClient())


