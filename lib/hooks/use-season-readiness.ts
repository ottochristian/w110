import { useQuery } from '@tanstack/react-query'

export type ReadinessStep = {
  id: string
  label: string
  description: string
  complete: boolean
  count?: number
  total?: number
  href: string
  optional?: boolean
}

export type SeasonReadiness = {
  season: { id: string; name: string; status: string }
  steps: ReadinessStep[]
  completedCount: number
  totalCount: number
  isComplete: boolean
}

export function useSeasonReadiness(seasonId: string | null | undefined) {
  return useQuery<SeasonReadiness>({
    queryKey: ['season-readiness', seasonId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/season-readiness?seasonId=${seasonId}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || 'Failed to load readiness')
      }
      return res.json()
    },
    enabled: !!seasonId,
    staleTime: 30 * 1000, // 30s — re-check often during setup
  })
}
