import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type RevenueSummary = {
  totalCollected: number
  outstanding: number
  refunded: number
  averagePerRegistration: number
  totalRegistrations: number
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

  // Validate enum params to prevent unexpected filter values
  const VALID_DATE_RANGES = ['custom', 'last-7', 'last-30', 'last-90']
  const VALID_STATUSES = ['all', 'unpaid', 'partially_paid', 'paid', 'cancelled', 'refunded']
  const VALID_PAYMENT_METHODS = ['all', 'stripe', 'check', 'cash', 'other']

  if (dateRange && !VALID_DATE_RANGES.includes(dateRange)) {
    return NextResponse.json({ error: 'Invalid dateRange value' }, { status: 400 })
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
  }
  if (payment && !VALID_PAYMENT_METHODS.includes(payment)) {
    return NextResponse.json({ error: 'Invalid payment method value' }, { status: 400 })
  }

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
      total_amount,
      status,
      season_id,
      created_at,
      seasons!inner(club_id)
    `)
    .eq('season_id', seasonId)
    .eq('seasons.club_id', clubIdToUse)

  // Apply program filter
  if (orderIdsFilter !== null) {
    if (orderIdsFilter.length === 0) {
      return NextResponse.json({
        totalCollected: 0,
        outstanding: 0,
        refunded: 0,
        averagePerRegistration: 0,
        totalRegistrations: 0,
      })
    }
    ordersQuery = ordersQuery.in('id', orderIdsFilter)
  }

  // Apply status filter
  if (status && status !== 'all') {
    ordersQuery = ordersQuery.eq('status', status)
  }

  // Apply date filter
  if (dateFilterFrom) {
    ordersQuery = ordersQuery.gte('created_at', dateFilterFrom)
  }
  if (dateFilterTo) {
    ordersQuery = ordersQuery.lte('created_at', dateFilterTo + 'T23:59:59')
  }

  const { data: orders, error: ordersError } = await ordersQuery

  if (ordersError) {
    return NextResponse.json(
      { error: ordersError.message || 'Failed to load orders' },
      { status: 500 }
    )
  }

  // Get all payments for these orders
  const orderIds = (orders || []).map((o: any) => o.id)
  
  let payments: any[] = []
  if (orderIds.length > 0) {
    let paymentsQuery = admin
      .from('payments')
      .select('order_id, amount, status, method')
      .in('order_id', orderIds)

    // Apply payment method filter
    if (payment && payment !== 'all') {
      paymentsQuery = paymentsQuery.eq('method', payment)
    }

    const { data: paymentsData, error: paymentsError } = await paymentsQuery

    if (paymentsError) {
      return NextResponse.json(
        { error: paymentsError.message || 'Failed to load payments' },
        { status: 500 }
      )
    }
    payments = paymentsData || []
  }

  // Get registration count for average calculation
  let regCountQuery = admin
    .from('registrations')
    .select('id, sub_programs!inner(program_id), seasons!inner(club_id)', { count: 'exact', head: true })
    .eq('season_id', seasonId)
    .eq('seasons.club_id', clubIdToUse)

  // Apply program filter to registration count
  if (programId) {
    regCountQuery = regCountQuery.eq('sub_programs.program_id', programId)
  }

  // Apply date filter to registration count
  if (dateFilterFrom) {
    regCountQuery = regCountQuery.gte('created_at', dateFilterFrom)
  }
  if (dateFilterTo) {
    regCountQuery = regCountQuery.lte('created_at', dateFilterTo + 'T23:59:59')
  }

  const { count: regCount } = await regCountQuery

  let totalCollected = 0
  let refunded = 0

  payments.forEach((payment: any) => {
    const amount = Number(payment.amount || 0)
    if (payment.status === 'succeeded') {
      totalCollected += amount
    } else if (payment.status === 'refunded') {
      refunded += amount
    }
  })

  // Calculate outstanding: orders that are unpaid or partially_paid
  let outstanding = 0
  ;(orders || []).forEach((order: any) => {
    const status = (order.status || '').toLowerCase()
    if (status === 'unpaid' || status === 'partially_paid') {
      outstanding += Number(order.total_amount || 0)
    }
  })

  const totalRegistrations = regCount || 0
  const averagePerRegistration = totalRegistrations > 0 ? totalCollected / totalRegistrations : 0

  const summary: RevenueSummary = {
    totalCollected,
    outstanding,
    refunded,
    averagePerRegistration,
    totalRegistrations,
  }

  return NextResponse.json(summary)
}
