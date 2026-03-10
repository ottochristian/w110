import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type CumulativeDataPoint = {
  date: string
  cumulativeAmount: number
  dailyAmount: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seasonId = searchParams.get('seasonId')
  const requestedClubId = searchParams.get('clubId')
  const dateRange = searchParams.get('dateRange')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const programId = searchParams.get('programId')
  const status = searchParams.get('status')
  const payment = searchParams.get('payment')

  // Require admin authentication
  const authResult = await requireAdmin(req)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user, supabase, profile } = authResult
  const role = profile.role as ProfileRole
  const isSystemAdmin = role === 'system_admin'
  const clubIdToUse = isSystemAdmin ? requestedClubId : profile.club_id

  if (!seasonId) {
    return NextResponse.json(
      { error: 'seasonId is required' },
      { status: 400 }
    )
  }

  if (!clubIdToUse) {
    return NextResponse.json(
      { error: 'clubId is required' },
      { status: 400 }
    )
  }

  if (!isSystemAdmin && clubIdToUse !== profile.club_id) {
    return NextResponse.json({ error: 'Forbidden: club mismatch' }, { status: 403 })
  }

  if (isSystemAdmin && !requestedClubId) {
    return NextResponse.json(
      { error: 'clubId is required for system admins' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // If programId filter is set, first get relevant order IDs
  let orderIdsFilter: string[] | null = null
  if (programId) {
    const { data: registrations } = await admin
      .from('registrations')
      .select(`
        id,
        sub_programs!inner(program_id)
      `)
      .eq('season_id', seasonId)
      .eq('sub_programs.program_id', programId)

    const registrationIds = (registrations || []).map((r: any) => r.id)
    
    if (registrationIds.length > 0) {
      const { data: orderItems } = await admin
        .from('order_items')
        .select('order_id')
        .in('registration_id', registrationIds)

      orderIdsFilter = [...new Set((orderItems || []).map((oi: any) => oi.order_id))]
    } else {
      orderIdsFilter = []
    }
  }

  // Get all orders for this season/club
  let ordersQuery = admin
    .from('orders')
    .select(`
      id,
      season_id,
      seasons!inner(club_id)
    `)
    .eq('season_id', seasonId)
    .eq('seasons.club_id', clubIdToUse)

  // Apply program filter
  if (orderIdsFilter !== null) {
    if (orderIdsFilter.length === 0) {
      return NextResponse.json({ timeseries: [] })
    }
    ordersQuery = ordersQuery.in('id', orderIdsFilter)
  }

  // Apply status filter
  if (status && status !== 'all') {
    ordersQuery = ordersQuery.eq('status', status)
  }

  const { data: orders, error: ordersError } = await ordersQuery

  if (ordersError) {
    return NextResponse.json(
      { error: ordersError.message || 'Failed to load orders' },
      { status: 500 }
    )
  }

  const orderIds = (orders || []).map((o: any) => o.id)
  
  if (orderIds.length === 0) {
    return NextResponse.json({ timeseries: [] })
  }

  // Calculate date filter
  let dateFilterFrom: string | null = null
  let dateFilterTo: string | null = null
  
  if (dateRange === 'custom' && dateFrom) {
    dateFilterFrom = dateFrom
    dateFilterTo = dateTo || new Date().toISOString().split('T')[0]
  } else if (dateRange) {
    const now = new Date()
    if (dateRange === 'last-7') {
      dateFilterFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    } else if (dateRange === 'last-30') {
      dateFilterFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    } else if (dateRange === 'last-90') {
      dateFilterFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
    dateFilterTo = now.toISOString().split('T')[0]
  }

  // Get all successful payments with processed_at date
  let paymentsQuery = admin
    .from('payments')
    .select('amount, status, processed_at, method')
    .in('order_id', orderIds)
    .eq('status', 'succeeded')
    .not('processed_at', 'is', null)
    .order('processed_at', { ascending: true })

  // Apply payment method filter
  if (payment && payment !== 'all') {
    paymentsQuery = paymentsQuery.eq('method', payment)
  }

  // Apply date filter
  if (dateFilterFrom) {
    paymentsQuery = paymentsQuery.gte('processed_at', dateFilterFrom)
  }
  if (dateFilterTo) {
    paymentsQuery = paymentsQuery.lte('processed_at', dateFilterTo + 'T23:59:59')
  }

  const { data: payments, error: paymentsError } = await paymentsQuery

  if (paymentsError) {
    return NextResponse.json(
      { error: paymentsError.message || 'Failed to load payments' },
      { status: 500 }
    )
  }

  // Group by date and calculate cumulative
  const dailyMap = new Map<string, number>()

  ;(payments || []).forEach((payment: any) => {
    const amount = Number(payment.amount || 0)
    const date = new Date(payment.processed_at)
    const dateKey = date.toISOString().split('T')[0]

    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + amount)
  })

  // Sort dates and calculate cumulative
  const sortedDates = Array.from(dailyMap.keys()).sort()
  let cumulative = 0
  const timeseries: CumulativeDataPoint[] = sortedDates.map((date) => {
    const dailyAmount = dailyMap.get(date) || 0
    cumulative += dailyAmount
    return {
      date,
      cumulativeAmount: cumulative,
      dailyAmount,
    }
  })

  return NextResponse.json({ timeseries })
}
