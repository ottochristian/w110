import { useQuery } from '@tanstack/react-query'
import { useSelectedSeason } from '@/lib/contexts/season-context'

type RevenueSummary = {
  totalCollected: number
  outstanding: number
  refunded: number
  averagePerRegistration: number
  totalRegistrations: number
}

type ProgramRevenue = {
  programId: string
  programName: string
  totalAmount: number
  paidAmount: number
  outstandingAmount: number
  registrationCount: number
}

type PaymentMethodBreakdown = {
  method: string
  amount: number
  count: number
}

type CumulativeDataPoint = {
  date: string
  cumulativeAmount: number
  dailyAmount: number
}

type OutstandingPayment = {
  orderId: string
  householdName: string
  amount: number
  daysSinceCreated: number
  programs: string[]
  orderDate: string
  status: string
}

export function useRevenueSummary(
  clubId: string | null,
  filters?: {
    dateRange?: string
    dateFrom?: string
    dateTo?: string
    programId?: string
    status?: string
    payment?: string
  }
) {
  const selectedSeason = useSelectedSeason()
  const selectedSeasonId = selectedSeason?.id

  return useQuery<RevenueSummary>({
    queryKey: ['revenue-summary', clubId, selectedSeasonId, filters],
    queryFn: async () => {
      if (!clubId || !selectedSeasonId) {
        throw new Error('Club ID and Season ID are required')
      }

      const params = new URLSearchParams({
        clubId,
        seasonId: selectedSeasonId,
      })

      if (filters?.dateRange) params.set('dateRange', filters.dateRange)
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters?.dateTo) params.set('dateTo', filters.dateTo)
      if (filters?.programId) params.set('programId', filters.programId)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.payment) params.set('payment', filters.payment)

      const res = await fetch(`/api/admin/revenue/summary?${params}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch revenue summary')
      }

      return res.json()
    },
    enabled: !!clubId && !!selectedSeasonId,
  })
}

export function useRevenueByProgram(
  clubId: string | null,
  filters?: {
    dateRange?: string
    dateFrom?: string
    dateTo?: string
    programId?: string
    status?: string
    payment?: string
  }
) {
  const selectedSeason = useSelectedSeason()
  const selectedSeasonId = selectedSeason?.id

  return useQuery<{ programs: ProgramRevenue[] }>({
    queryKey: ['revenue-by-program', clubId, selectedSeasonId, filters],
    queryFn: async () => {
      if (!clubId || !selectedSeasonId) {
        throw new Error('Club ID and Season ID are required')
      }

      const params = new URLSearchParams({
        clubId,
        seasonId: selectedSeasonId,
      })

      if (filters?.dateRange) params.set('dateRange', filters.dateRange)
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters?.dateTo) params.set('dateTo', filters.dateTo)
      if (filters?.programId) params.set('programId', filters.programId)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.payment) params.set('payment', filters.payment)

      const res = await fetch(`/api/admin/revenue/by-program?${params}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch revenue by program')
      }

      return res.json()
    },
    enabled: !!clubId && !!selectedSeasonId,
  })
}

export function usePaymentMethods(
  clubId: string | null,
  filters?: {
    dateRange?: string
    dateFrom?: string
    dateTo?: string
    programId?: string
    status?: string
    payment?: string
  }
) {
  const selectedSeason = useSelectedSeason()
  const selectedSeasonId = selectedSeason?.id

  return useQuery<{ methods: PaymentMethodBreakdown[] }>({
    queryKey: ['payment-methods', clubId, selectedSeasonId, filters],
    queryFn: async () => {
      if (!clubId || !selectedSeasonId) {
        throw new Error('Club ID and Season ID are required')
      }

      const params = new URLSearchParams({
        clubId,
        seasonId: selectedSeasonId,
      })

      if (filters?.dateRange) params.set('dateRange', filters.dateRange)
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters?.dateTo) params.set('dateTo', filters.dateTo)
      if (filters?.programId) params.set('programId', filters.programId)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.payment) params.set('payment', filters.payment)

      const res = await fetch(`/api/admin/revenue/by-method?${params}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch payment methods')
      }

      return res.json()
    },
    enabled: !!clubId && !!selectedSeasonId,
  })
}

export function useCumulativeRevenue(
  clubId: string | null,
  filters?: {
    dateRange?: string
    dateFrom?: string
    dateTo?: string
    programId?: string
    status?: string
    payment?: string
  }
) {
  const selectedSeason = useSelectedSeason()
  const selectedSeasonId = selectedSeason?.id

  return useQuery<{ timeseries: CumulativeDataPoint[] }>({
    queryKey: ['cumulative-revenue', clubId, selectedSeasonId, filters],
    queryFn: async () => {
      if (!clubId || !selectedSeasonId) {
        throw new Error('Club ID and Season ID are required')
      }

      const params = new URLSearchParams({
        clubId,
        seasonId: selectedSeasonId,
      })

      if (filters?.dateRange) params.set('dateRange', filters.dateRange)
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters?.dateTo) params.set('dateTo', filters.dateTo)
      if (filters?.programId) params.set('programId', filters.programId)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.payment) params.set('payment', filters.payment)

      const res = await fetch(`/api/admin/revenue/cumulative?${params}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch cumulative revenue')
      }

      return res.json()
    },
    enabled: !!clubId && !!selectedSeasonId,
  })
}

export function useOutstandingPayments(
  clubId: string | null,
  filters?: {
    dateRange?: string
    dateFrom?: string
    dateTo?: string
    programId?: string
    status?: string
    payment?: string
  }
) {
  const selectedSeason = useSelectedSeason()
  const selectedSeasonId = selectedSeason?.id

  return useQuery<{ outstanding: OutstandingPayment[] }>({
    queryKey: ['outstanding-payments', clubId, selectedSeasonId, filters],
    queryFn: async () => {
      if (!clubId || !selectedSeasonId) {
        throw new Error('Club ID and Season ID are required')
      }

      const params = new URLSearchParams({
        clubId,
        seasonId: selectedSeasonId,
      })

      if (filters?.dateRange) params.set('dateRange', filters.dateRange)
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters?.dateTo) params.set('dateTo', filters.dateTo)
      if (filters?.programId) params.set('programId', filters.programId)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.payment) params.set('payment', filters.payment)

      const res = await fetch(`/api/admin/revenue/outstanding?${params}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch outstanding payments')
      }

      return res.json()
    },
    enabled: !!clubId && !!selectedSeasonId,
  })
}
