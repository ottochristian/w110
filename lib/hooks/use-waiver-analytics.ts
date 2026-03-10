import { useQuery } from '@tanstack/react-query'

export interface WaiverSummary {
  totalRequired: number
  complianceRate: number
  athletesMissing: number
  totalSignatures: number
  recentSignatures: number
}

export interface ProgramCompliance {
  programId: string
  programName: string
  totalAthletes: number
  compliantAthletes: number
  complianceRate: number
}

export interface TimelinePoint {
  date: string
  count: number
  cumulative: number
}

export interface AthleteWithMissingWaivers {
  athleteId: string
  athleteName: string
  programName: string
  missingWaivers: Array<{ id: string; title: string }>
  guardianName: string
  guardianEmail: string
}

export interface WaiverDetail {
  waiverId: string
  title: string
  required: boolean
  totalAthletes: number
  signedCount: number
  signedPercentage: number
}

export interface WaiverFilters {
  programId?: string
  startDate?: string
  endDate?: string
}

// Hook to fetch waiver summary
export function useWaiverSummary(
  clubId: string | null,
  seasonId: string | null,
  filters?: WaiverFilters
) {
  return useQuery<WaiverSummary>({
    queryKey: ['waiver-summary', clubId, seasonId, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (clubId) params.append('clubId', clubId)
      if (seasonId) params.append('seasonId', seasonId)
      if (filters?.programId) params.append('programId', filters.programId)

      const response = await fetch(`/api/admin/waivers/summary?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch waiver summary')
      }
      return response.json()
    },
    enabled: !!clubId && !!seasonId,
  })
}

// Hook to fetch compliance by program
export function useWaiverComplianceByProgram(
  clubId: string | null,
  seasonId: string | null
) {
  return useQuery<ProgramCompliance[]>({
    queryKey: ['waiver-compliance-by-program', clubId, seasonId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (clubId) params.append('clubId', clubId)
      if (seasonId) params.append('seasonId', seasonId)

      const response = await fetch(`/api/admin/waivers/by-program?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch waiver compliance by program')
      }
      return response.json()
    },
    enabled: !!clubId && !!seasonId,
  })
}

// Hook to fetch signature timeline
export function useWaiverSignatureTimeline(
  clubId: string | null,
  seasonId: string | null,
  dateRange?: { startDate?: string; endDate?: string }
) {
  return useQuery<TimelinePoint[]>({
    queryKey: ['waiver-signature-timeline', clubId, seasonId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (clubId) params.append('clubId', clubId)
      if (seasonId) params.append('seasonId', seasonId)
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate)
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate)

      const response = await fetch(`/api/admin/waivers/timeline?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch waiver timeline')
      }
      return response.json()
    },
    enabled: !!clubId && !!seasonId,
  })
}

// Hook to fetch athletes with missing waivers
export function useAthletesMissingWaivers(
  clubId: string | null,
  seasonId: string | null,
  filters?: WaiverFilters
) {
  return useQuery<AthleteWithMissingWaivers[]>({
    queryKey: ['athletes-missing-waivers', clubId, seasonId, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (clubId) params.append('clubId', clubId)
      if (seasonId) params.append('seasonId', seasonId)
      if (filters?.programId) params.append('programId', filters.programId)

      const response = await fetch(`/api/admin/waivers/missing?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch athletes missing waivers')
      }
      return response.json()
    },
    enabled: !!clubId && !!seasonId,
  })
}

// Hook to fetch waiver details
export function useWaiverDetails(
  clubId: string | null,
  seasonId: string | null
) {
  return useQuery<WaiverDetail[]>({
    queryKey: ['waiver-details', clubId, seasonId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (clubId) params.append('clubId', clubId)
      if (seasonId) params.append('seasonId', seasonId)

      const response = await fetch(`/api/admin/waivers/details?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch waiver details')
      }
      return response.json()
    },
    enabled: !!clubId && !!seasonId,
  })
}
