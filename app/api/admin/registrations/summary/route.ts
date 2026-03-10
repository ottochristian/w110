import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type SummaryResponse = {
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seasonId = searchParams.get('seasonId')
  const requestedClubId = searchParams.get('clubId')

  // Require admin authentication
  const authResult = await requireAdmin(req)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user, supabase, profile } = authResult
  const role = profile.role as ProfileRole
  const isSystemAdmin = role === 'system_admin'
  const clubIdToUse = isSystemAdmin ? requestedClubId : profile.club_id // admins are scoped to their profile club

  if (!seasonId) {
    return NextResponse.json(
      { error: 'seasonId is required' },
      { status: 400 }
    )
  }

  if (!clubIdToUse) {
    return NextResponse.json(
      { error: 'clubId is required (use your profile club or pass clubId)' },
      { status: 400 }
    )
  }

  // For admins: enforce their profile club
  if (!isSystemAdmin && clubIdToUse !== profile.club_id) {
    return NextResponse.json({ error: 'Forbidden: club mismatch' }, { status: 403 })
  }

  // For system admins: require an explicit clubId
  if (isSystemAdmin && !requestedClubId) {
    return NextResponse.json(
      { error: 'clubId is required for system admins' },
      { status: 400 }
    )
  }

  // Admin client to bypass RLS for aggregation
  const admin = createAdminClient()

  // Pull the minimal fields needed for aggregation; filter by season and club via seasons join
  const { data, error } = await admin
    .from('registrations')
    .select(
      `
        id,
        status,
        payment_status,
        amount_paid,
        athlete_id,
        athletes(household_id),
        seasons!inner(club_id)
      `,
      {
        count: 'exact',
      }
    )
    .eq('season_id', seasonId)
    .eq('seasons.club_id', clubIdToUse)

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to load registration summary' },
      { status: 500 }
    )
  }

  const registrations = data || []

  const totals = {
    registrations: registrations.length,
    athletes: 0,
    households: 0,
  }

  const status = {
    pending: 0,
    confirmed: 0,
    waitlisted: 0,
    cancelled: 0,
  }

  const payments = {
    paidCount: 0,
    unpaidCount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    pendingAmount: 0,
  }

  const refunds = {
    count: 0,
    amount: 0,
  }

  const athleteIds = new Set<string>()
  const householdIds = new Set<string>()

  registrations.forEach((reg: any) => {
    const statusKey = reg.status as keyof typeof status
    if (status[statusKey] !== undefined) {
      status[statusKey] += 1
    }

    const paymentStatus = (reg.payment_status || '').toLowerCase()
    const amountPaid = Number(reg.amount_paid || 0)

    if (paymentStatus === 'paid') {
      payments.paidCount += 1
      payments.paidAmount += amountPaid
    } else if (paymentStatus === 'pending') {
      payments.pendingAmount += amountPaid
    } else {
      payments.unpaidCount += 1
      payments.unpaidAmount += amountPaid
    }

    if (reg.athlete_id) {
      athleteIds.add(reg.athlete_id)
    }

    const householdId = reg.athletes?.household_id
    if (householdId) {
      householdIds.add(householdId)
    }
  })

  totals.athletes = athleteIds.size
  totals.households = householdIds.size

  const netRevenue = payments.paidAmount - refunds.amount

  const response: SummaryResponse = {
    totals,
    status,
    payments,
    refunds,
    netRevenue,
  }

  return NextResponse.json(response)
}
