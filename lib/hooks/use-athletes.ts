import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelectedSeason } from '@/lib/contexts/season-context'
import { createClient } from '@/lib/supabase/client'

type AthleteSummary = {
  totalAthletes: number
  newAthletes: number
  returningAthletes: number
  uniqueHouseholds: number
}

type ProgramAthletes = {
  programId: string
  programName: string
  athleteCount: number
}

type GenderDistribution = {
  gender: string
  count: number
}

type AgeGroupDistribution = {
  ageGroup: string
  count: number
}

type AthleteFilters = {
  programId?: string
  gender?: string
}

type Athlete = {
  id: string
  household_id: string | null
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: string | null
  club_id: string
  created_at: string
  updated_at: string
  medical_notes?: string | null
  registrations?: any[]
}

// Hook to fetch all athletes (for admin pages with RLS filtering by club)
// NOTE: For large datasets, use useAthletesPaginated instead
export function useAthletes() {
  return useQuery<Athlete[]>({
    queryKey: ['athletes'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .order('first_name', { ascending: true })
        .limit(100) // Default limit for non-paginated queries

      if (error) {
        throw new Error(error.message || 'Failed to fetch athletes')
      }

      return data || []
    },
  })
}

// Paginated athletes hook with search and filtering
export function useAthletesPaginated(
  page: number = 1,
  pageSize: number = 50,
  searchTerm?: string,
  filters?: {
    programId?: string
    gender?: string
  }
) {
  return useQuery<{
    athletes: Athlete[]
    totalCount: number
    totalPages: number
    currentPage: number
  }>({
    queryKey: ['athletes-paginated', page, pageSize, searchTerm, filters],
    queryFn: async () => {
      const supabase = createClient()
      
      // Build query
      let query = supabase
        .from('athletes')
        .select('*', { count: 'exact' })
        .order('first_name', { ascending: true })

      // Apply search
      if (searchTerm && searchTerm.length > 0) {
        query = query.or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`
        )
      }

      // Apply filters
      if (filters?.gender && filters.gender !== 'all') {
        query = query.eq('gender', filters.gender)
      }

      // Apply pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        throw new Error(error.message || 'Failed to fetch athletes')
      }

      const totalCount = count || 0
      const totalPages = Math.ceil(totalCount / pageSize)

      return {
        athletes: data || [],
        totalCount,
        totalPages,
        currentPage: page,
      }
    },
  })
}

// Batch waiver check hook
export function useBatchWaiverCheck(
  athleteIds: string[],
  seasonId: string | null
) {
  return useQuery<Record<string, boolean>>({
    queryKey: ['batch-waiver-check', athleteIds, seasonId],
    queryFn: async () => {
      if (!seasonId || athleteIds.length === 0) {
        return {}
      }

      const supabase = createClient()
      const { data, error } = await supabase.rpc('check_waivers_batch', {
        p_athlete_ids: athleteIds,
        p_season_id: seasonId,
      })

      if (error) {
        console.error('Batch waiver check error:', error)
        return {}
      }

      // Convert array to object for easy lookup
      const result: Record<string, boolean> = {}
      if (data) {
        for (const item of data) {
          result[item.athlete_id] = item.has_signed_all_required
        }
      }

      return result
    },
    enabled: !!seasonId && athleteIds.length > 0,
  })
}

// Hook to fetch a single athlete by ID
export function useAthlete(athleteId: string | null) {
  return useQuery<Athlete>({
    queryKey: ['athlete', athleteId],
    queryFn: async () => {
      if (!athleteId) {
        throw new Error('Athlete ID is required')
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('id', athleteId)
        .single()

      if (error) {
        throw new Error(error.message || 'Failed to fetch athlete')
      }

      return data
    },
    enabled: !!athleteId,
  })
}

// Hook to update an athlete
export function useUpdateAthlete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      athleteId, 
      updates 
    }: { 
      athleteId: string
      updates: Partial<Athlete> 
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('athletes')
        .update(updates)
        .eq('id', athleteId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message || 'Failed to update athlete')
      }

      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['athlete', variables.athleteId] })
      queryClient.invalidateQueries({ queryKey: ['athletes'] })
      queryClient.invalidateQueries({ queryKey: ['athletes-by-household'] })
    },
  })
}

// Hook to fetch athletes by household ID (for parent portal)
export function useAthletesByHousehold(householdId: string | null) {
  return useQuery<Athlete[]>({
    queryKey: ['athletes-by-household', householdId],
    queryFn: async () => {
      if (!householdId) {
        return []
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('household_id', householdId)
        .order('first_name', { ascending: true })

      if (error) {
        throw new Error(error.message || 'Failed to fetch athletes')
      }

      return data || []
    },
    enabled: !!householdId,
  })
}

// Simple count hook for dashboard
export function useAthletesCount(clubId: string | null, seasonId: string | null) {
  return useQuery<number>({
    queryKey: ['athletes-count', clubId, seasonId],
    queryFn: async () => {
      if (!clubId || !seasonId) {
        throw new Error('Club ID and Season ID are required')
      }

      const params = new URLSearchParams({
        clubId,
        seasonId,
      })

      const res = await fetch(`/api/admin/athletes/summary?${params}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch athlete count')
      }

      const data = await res.json()
      return data.totalAthletes
    },
    enabled: !!clubId && !!seasonId,
  })
}

export function useAthleteSummary(
  clubId: string | null,
  filters?: AthleteFilters
) {
  const selectedSeason = useSelectedSeason()
  const selectedSeasonId = selectedSeason?.id

  return useQuery<AthleteSummary>({
    queryKey: ['athlete-summary', clubId, selectedSeasonId, filters],
    queryFn: async () => {
      if (!clubId || !selectedSeasonId) {
        throw new Error('Club ID and Season ID are required')
      }

      const params = new URLSearchParams({
        clubId,
        seasonId: selectedSeasonId,
      })

      if (filters?.programId && filters.programId !== 'all') params.set('programId', filters.programId)
      if (filters?.gender && filters.gender !== 'all') params.set('gender', filters.gender)

      const res = await fetch(`/api/admin/athletes/summary?${params}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch athlete summary')
      }

      return res.json()
    },
    enabled: !!clubId && !!selectedSeasonId,
  })
}

export function useAthletesByProgram(
  clubId: string | null,
  filters?: AthleteFilters
) {
  const selectedSeason = useSelectedSeason()
  const selectedSeasonId = selectedSeason?.id

  return useQuery<{ programs: ProgramAthletes[] }>({
    queryKey: ['athletes-by-program', clubId, selectedSeasonId, filters],
    queryFn: async () => {
      if (!clubId || !selectedSeasonId) {
        throw new Error('Club ID and Season ID are required')
      }

      const params = new URLSearchParams({
        clubId,
        seasonId: selectedSeasonId,
      })

      if (filters?.programId && filters.programId !== 'all') params.set('programId', filters.programId)
      if (filters?.gender && filters.gender !== 'all') params.set('gender', filters.gender)

      const res = await fetch(`/api/admin/athletes/by-program?${params}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch athletes by program')
      }

      return res.json()
    },
    enabled: !!clubId && !!selectedSeasonId,
  })
}

export function useAthletesByGender(
  clubId: string | null,
  filters?: AthleteFilters
) {
  const selectedSeason = useSelectedSeason()
  const selectedSeasonId = selectedSeason?.id

  return useQuery<{ distribution: GenderDistribution[] }>({
    queryKey: ['athletes-by-gender', clubId, selectedSeasonId, filters],
    queryFn: async () => {
      if (!clubId || !selectedSeasonId) {
        throw new Error('Club ID and Season ID are required')
      }

      const params = new URLSearchParams({
        clubId,
        seasonId: selectedSeasonId,
      })

      if (filters?.programId && filters.programId !== 'all') params.set('programId', filters.programId)

      const res = await fetch(`/api/admin/athletes/by-gender?${params}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch athletes by gender')
      }

      return res.json()
    },
    enabled: !!clubId && !!selectedSeasonId,
  })
}

export function useAthletesByAge(
  clubId: string | null,
  filters?: AthleteFilters
) {
  const selectedSeason = useSelectedSeason()
  const selectedSeasonId = selectedSeason?.id

  return useQuery<{ distribution: AgeGroupDistribution[] }>({
    queryKey: ['athletes-by-age', clubId, selectedSeasonId, filters],
    queryFn: async () => {
      if (!clubId || !selectedSeasonId) {
        throw new Error('Club ID and Season ID are required')
      }

      const params = new URLSearchParams({
        clubId,
        seasonId: selectedSeasonId,
      })

      if (filters?.programId && filters.programId !== 'all') params.set('programId', filters.programId)
      if (filters?.gender && filters.gender !== 'all') params.set('gender', filters.gender)

      const res = await fetch(`/api/admin/athletes/by-age?${params}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch athletes by age')
      }

      return res.json()
    },
    enabled: !!clubId && !!selectedSeasonId,
  })
}
