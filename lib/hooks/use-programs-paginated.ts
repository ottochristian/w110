import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface ProgramsPaginationParams {
  page: number
  pageSize: number
  search?: string
  status?: string
}

export interface PaginatedPrograms {
  data: any[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function useProgramsPaginated(
  seasonId: string | undefined,
  params: ProgramsPaginationParams
) {
  return useQuery({
    queryKey: ['programs', 'paginated', seasonId, params],
    queryFn: async () => {
      if (!seasonId) throw new Error('Season required')
      
      const supabase = createClient()
      const { page, pageSize, search, status } = params
      
      // Build query
      let query = supabase
        .from('programs')
        .select(`
          *,
          sub_programs (
            id,
            name,
            status,
            registration_fee,
            max_capacity,
            registrations (
              id,
              status
            )
          )
        `, { count: 'exact' })
        .eq('season_id', seasonId)
        .order('name', { ascending: true })
      
      // Add search filter
      if (search && search.trim()) {
        query = query.ilike('name', `%${search}%`)
      }
      
      // Add status filter
      if (status && status !== 'all') {
        query = query.eq('status', status)
      }
      
      // Apply pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
      
      const { data, error, count } = await query
      
      if (error) throw error
      
      // Calculate enrollment counts for each program
      const programsWithCounts = (data || []).map((program: any) => {
        const totalEnrollment = program.sub_programs?.reduce((sum: number, sp: any) => {
          return sum + (sp.registrations?.filter((r: any) => r.status !== 'cancelled').length || 0)
        }, 0) || 0
        
        return {
          ...program,
          totalEnrollment,
        }
      })
      
      return {
        data: programsWithCounts,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      }
    },
    enabled: !!seasonId,
    placeholderData: (previousData) => previousData,
  })
}
