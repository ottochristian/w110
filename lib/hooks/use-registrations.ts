import { useQuery } from '@tanstack/react-query'
import { registrationsService } from '../services/registrations-service'

/**
 * React Query hook for fetching registrations
 * PHASE 2: RLS handles club filtering automatically - no clubId needed!
 * 
 * @param seasonId - Optional season filter
 */
export function useRegistrations(seasonId?: string) {
  return useQuery({
    queryKey: ['registrations', seasonId],
    queryFn: async () => {
      // RLS automatically filters by club - no manual filtering needed!
      const result = await registrationsService.getRegistrations(seasonId)
      if (result.error) throw result.error
      return result.data || []
    },
    enabled: seasonId !== undefined, // Only fetch if seasonId is provided (or explicitly undefined)
  })
}

/**
 * React Query hook for recent registrations
 */
export function useRecentRegistrations(seasonId: string | null, limit = 5) {
  return useQuery({
    queryKey: ['registrations', 'recent', seasonId, limit],
    queryFn: async () => {
      if (!seasonId) throw new Error('Season ID is required')
      const result = await registrationsService.getRecentRegistrations(
        seasonId,
        limit
      )
      if (result.error) throw result.error
      return result.data || []
    },
    enabled: !!seasonId,
  })
}

/**
 * React Query hook for registration count
 */
export function useRegistrationsCount(seasonId?: string) {
  return useQuery({
    queryKey: ['registrations', 'count', seasonId],
    queryFn: async () => {
      const result = await registrationsService.countRegistrations(seasonId)
      if (result.error) throw result.error
      return result.data || 0
    },
  })
}

/**
 * React Query hook for total revenue
 */
export function useTotalRevenue(seasonId?: string) {
  return useQuery({
    queryKey: ['registrations', 'revenue', seasonId],
    queryFn: async () => {
      const result = await registrationsService.getTotalRevenue(seasonId)
      if (result.error) throw result.error
      return result.data || 0
    },
  })
}

/**
 * Registration summary (server endpoint aggregates counts/revenue)
 */
export type RegistrationSummary = {
  totals: {
    registrations: number
    athletes: number
    households: number
  }
  status: {
    pending: number
    confirmed: number
    waitlisted: number
    cancelled: number
  }
  payments: {
    paidCount: number
    unpaidCount: number
    paidAmount: number
    unpaidAmount: number
    pendingAmount: number
  }
  refunds: {
    count: number
    amount: number
  }
  netRevenue: number
}

export function useRegistrationSummary(seasonId?: string, clubId?: string) {
  return useQuery<RegistrationSummary>({
    queryKey: ['registrations', 'summary', seasonId, clubId],
    enabled: !!seasonId, // need season to scope
    queryFn: async () => {
      if (!seasonId) {
        throw new Error('seasonId is required')
      }

      const params = new URLSearchParams({ seasonId })
      if (clubId) params.set('clubId', clubId)

      const resp = await fetch(`/api/admin/registrations/summary?${params.toString()}`)
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}))
        const message = json?.error || resp.statusText || 'Failed to load summary'
        throw new Error(message)
      }
      return (await resp.json()) as RegistrationSummary
    },
  })
}

/**
 * Revenue timeseries (paid amounts per day)
 */
export type RevenuePoint = {
  date: string
  paidAmount: number
}

export function useRevenueTimeseries(seasonId?: string, clubId?: string) {
  return useQuery<{ timeseries: RevenuePoint[] }>({
    queryKey: ['registrations', 'revenue-timeseries', seasonId, clubId],
    enabled: !!seasonId,
    queryFn: async () => {
      if (!seasonId) throw new Error('seasonId is required')
      const params = new URLSearchParams({ seasonId })
      if (clubId) params.set('clubId', clubId)
      const resp = await fetch(`/api/admin/registrations/revenue-timeseries?${params.toString()}`)
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}))
        const message = json?.error || resp.statusText || 'Failed to load revenue timeseries'
        throw new Error(message)
      }
      return (await resp.json()) as { timeseries: RevenuePoint[] }
    },
  })
}

/**
 * Per-program summary (counts + revenue)
 */
export type ProgramSummary = {
  programId: string
  programName: string
  registrations: number
  confirmed: number
  pending: number
  waitlisted: number
  cancelled: number
  paidAmount: number
  unpaidAmount: number
}

export function useRegistrationsByProgram(seasonId?: string, clubId?: string) {
  return useQuery<{ bySport: ProgramSummary[] }>({
    queryKey: ['registrations', 'by-program', seasonId, clubId],
    enabled: !!seasonId,
    queryFn: async () => {
      if (!seasonId) throw new Error('seasonId is required')
      const params = new URLSearchParams({ seasonId })
      if (clubId) params.set('clubId', clubId)
      const resp = await fetch(`/api/admin/registrations/by-sport?${params.toString()}`)
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}))
        const message = json?.error || resp.statusText || 'Failed to load program summary'
        throw new Error(message)
      }
      return (await resp.json()) as { bySport: ProgramSummary[] }
    },
  })
}

/**
 * Program timeseries (signups and revenue per program per day)
 */
export type ProgramTimeseries = {
  signups: Array<{ date: string; programId: string; programName: string; count: number }>
  revenue: Array<{ date: string; programId: string; programName: string; paidAmount: number }>
}

export function useProgramTimeseries(seasonId?: string, clubId?: string) {
  return useQuery<ProgramTimeseries>({
    queryKey: ['registrations', 'program-timeseries', seasonId, clubId],
    enabled: !!seasonId,
    queryFn: async () => {
      if (!seasonId) throw new Error('seasonId is required')
      const params = new URLSearchParams({ seasonId })
      if (clubId) params.set('clubId', clubId)
      const resp = await fetch(`/api/admin/registrations/program-timeseries?${params.toString()}`)
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}))
        const message = json?.error || resp.statusText || 'Failed to load program timeseries'
        throw new Error(message)
      }
      return (await resp.json()) as ProgramTimeseries
    },
  })
}

/**
 * React Query hook for fetching registrations by athlete ID
 * RLS handles club filtering automatically
 */
export function useAthleteRegistrations(athleteId: string | undefined) {
  return useQuery({
    queryKey: ['registrations', 'athlete', athleteId],
    queryFn: async () => {
      if (!athleteId) throw new Error('Athlete ID is required')
      const result = await registrationsService.getAthleteRegistrations(athleteId)
      if (result.error) throw result.error
      return result.data || []
    },
    enabled: !!athleteId,
  })
}




