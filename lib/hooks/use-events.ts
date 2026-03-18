import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export type Event = {
  id: string
  club_id: string
  season_id: string | null
  sub_program_id: string | null
  group_id: string | null
  title: string
  event_type: 'training' | 'race' | 'camp' | 'meeting' | 'other'
  location: string | null
  start_at: string
  end_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  sub_programs?: { name: string; programs?: { name: string } | null } | null
  groups?: { name: string } | null
}

export type CreateEventInput = {
  club_id: string
  season_id?: string | null
  sub_program_id?: string | null
  group_id?: string | null
  title: string
  event_type: Event['event_type']
  location?: string | null
  start_at: string
  end_at?: string | null
  notes?: string | null
}

export type UpdateEventInput = Partial<Omit<CreateEventInput, 'club_id'>>

// Fetch events for a club/season window
export function useEvents(clubId: string | undefined, seasonId?: string | null) {
  return useQuery({
    queryKey: ['events', clubId, seasonId],
    enabled: !!clubId,
    queryFn: async () => {
      let q = supabase
        .from('events')
        .select('*, sub_programs(name, programs(name)), groups(name)')
        .eq('club_id', clubId!)
        .order('start_at', { ascending: true })

      if (seasonId) q = q.eq('season_id', seasonId)

      const { data, error } = await q
      if (error) throw error
      return data as Event[]
    },
  })
}

// Upcoming events (next N from now)
export function useUpcomingEvents(clubId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ['events', 'upcoming', clubId, limit],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, sub_programs(name, programs(name)), groups(name)')
        .eq('club_id', clubId!)
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(limit)

      if (error) throw error
      return data as Event[]
    },
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('events')
        .insert({ ...input, created_by: user?.id })
        .select()
        .single()
      if (error) throw error
      return data as Event
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateEventInput }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Event
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}
