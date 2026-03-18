import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface RegistrationsPaginationParams {
  page: number
  pageSize: number
  search?: string
  status?: string
  paymentStatus?: string
}

export interface PaginatedRegistrations {
  data: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function useRegistrationsPaginated(
  seasonId: string | undefined,
  params: RegistrationsPaginationParams
) {
  return useQuery({
    queryKey: ['registrations', 'paginated', seasonId, params],
    queryFn: async () => {
      if (!seasonId) throw new Error('Season required')
      
      const supabase = createClient()
      const { page, pageSize, search, status, paymentStatus } = params
      
      // Build query with all relationships
      let query = supabase
        .from('registrations')
        .select(`
          *,
          athletes (
            id,
            first_name,
            last_name,
            date_of_birth,
            household_id,
            households (
              id,
              household_guardians (
                user_id,
                profiles (
                  id,
                  email,
                  first_name,
                  last_name
                )
              )
            )
          ),
          sub_programs!inner (
            id,
            name,
            programs!inner (
              id,
              name
            )
          )
        `, { count: 'exact' })
        .eq('season_id', seasonId)
        .order('created_at', { ascending: false })
      
      // Add search filter
      if (search && search.trim()) {
        // Search in athlete names
        query = query.or(
          `athletes.first_name.ilike.%${search}%,athletes.last_name.ilike.%${search}%`,
          { foreignTable: 'athletes' }
        )
      }
      
      // Add status filter
      if (status && status !== 'all') {
        query = query.eq('status', status)
      }
      
      // Add payment status filter
      if (paymentStatus && paymentStatus !== 'all') {
        query = query.eq('payment_status', paymentStatus)
      }
      
      // Apply pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
      
      const { data, error, count } = await query
      
      if (error) throw error
      
      return {
        data: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      }
    },
    enabled: !!seasonId,
    // Keep previous data while fetching new page
    placeholderData: (previousData) => previousData,
  })
}
