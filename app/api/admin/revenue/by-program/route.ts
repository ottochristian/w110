import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/server'



type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type ProgramRevenue = {
  programId: string
  programName: string
  totalAmount: number
  paidAmount: number
  outstandingAmount: number
  registrationCount: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seasonId = searchParams.get('seasonId')
  const requestedClubId = searchParams.get('clubId')
  const dateRange = searchParams.get('dateRange')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const programIdFilter = searchParams.get('programId')

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

  // Get all registrations with program info and payment status
  let registrationsQuery = admin
    .from('registrations')
    .select(`
      id,
      payment_status,
      amount_paid,
      created_at,
      sub_programs!inner(id, program_id, programs(id, name)),
      seasons!inner(club_id)
    `)
    .eq('season_id', seasonId)
    .eq('seasons.club_id', clubIdToUse)

  // Apply program filter
  if (programIdFilter) {
    registrationsQuery = registrationsQuery.eq('sub_programs.program_id', programIdFilter)
  }

  // Apply date filter
  if (dateFilterFrom) {
    registrationsQuery = registrationsQuery.gte('created_at', dateFilterFrom)
  }
  if (dateFilterTo) {
    registrationsQuery = registrationsQuery.lte('created_at', dateFilterTo + 'T23:59:59')
  }

  const { data: registrations, error: regError } = await registrationsQuery

  if (regError) {
    return NextResponse.json(
      { error: regError.message || 'Failed to load registrations' },
      { status: 500 }
    )
  }

  const programMap = new Map<string, ProgramRevenue>()

  ;(registrations || []).forEach((row: any) => {
    const programId = row.sub_programs?.programs?.id
    const programName = row.sub_programs?.programs?.name || 'Unknown Program'
    const paymentStatus = (row.payment_status || '').toLowerCase()
    const amount = Number(row.amount_paid || 0)

    if (!programMap.has(programId)) {
      programMap.set(programId, {
        programId,
        programName,
        totalAmount: 0,
        paidAmount: 0,
        outstandingAmount: 0,
        registrationCount: 0,
      })
    }

    const prog = programMap.get(programId)!
    prog.registrationCount += 1
    prog.totalAmount += amount

    if (paymentStatus === 'paid') {
      prog.paidAmount += amount
    } else {
      prog.outstandingAmount += amount
    }
  })

  const result = Array.from(programMap.values()).sort(
    (a, b) => b.totalAmount - a.totalAmount
  )

  return NextResponse.json({ programs: result })
}
