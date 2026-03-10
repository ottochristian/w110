import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface OrdersPaginationParams {
  page: number
  pageSize: number
  search?: string
  status?: string
}

export interface PaginatedOrders {
  data: any[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function useOrdersPaginated(
  seasonId: string | undefined,
  params: OrdersPaginationParams
) {
  return useQuery({
    queryKey: ['orders', 'paginated', seasonId, params],
    queryFn: async () => {
      if (!seasonId) throw new Error('Season required')
      
      const supabase = createClient()
      const { page, pageSize, search, status } = params
      
      // Build query with relationships
      let query = supabase
        .from('orders')
        .select(`
          *,
          households (
            id,
            household_guardians (
              profiles (
                id,
                email,
                first_name,
                last_name
              )
            )
          ),
          payments (
            id,
            amount,
            status,
            payment_method,
            created_at
          )
        `, { count: 'exact' })
        .eq('season_id', seasonId)
        .order('created_at', { ascending: false })
      
      // Add search filter (search by parent email/name)
      if (search && search.trim()) {
        // This is complex - might need to filter client-side or use RPC
        // For now, just search by order ID
        if (search.match(/^[0-9a-f-]{36}$/i)) {
          query = query.eq('id', search)
        }
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
      
      return {
        data: data || [],
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
