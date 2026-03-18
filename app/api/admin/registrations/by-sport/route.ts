import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createClient, createAdminClient } from '@/lib/supabase/server'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type ProgramSummary = {
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seasonId = searchParams.get('seasonId')
  const requestedClubId = searchParams.get('clubId')

  if (!seasonId) {
    return NextResponse.json(
      { error: 'seasonId is required' },
      { status: 400 }
    )
  }

  // Auth using requester session
  // Require admin authentication
  const authResult = await requireAdmin(req)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user, supabase, profile } = authResult
  const role = profile.role as ProfileRole
  const isSystemAdmin = role === 'system_admin'
  const clubIdToUse = isSystemAdmin ? requestedClubId : profile.club_id

  const admin = createAdminClient()

  // Step 1: registrations with sub_program_id -> program_id/name
  const { data, error } = await admin
    .from('registrations')
    .select(
      `
        status,
        payment_status,
        amount_paid,
        sub_programs!inner(id, program_id, programs(name)),
        seasons!inner(club_id)
      `
    )
    .eq('season_id', seasonId)
    .eq('seasons.club_id', clubIdToUse)

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to load by-program summary (registrations)' },
      { status: 500 }
    )
  }

  const summaries = new Map<string, ProgramSummary>()

  ;(data || []).forEach((row: any) => {
    const programId = row.sub_programs?.program_id as string | undefined
    if (!programId) return
    const programName = row.sub_programs?.programs?.name || 'Unknown program'

    const key = programId
    if (!summaries.has(key)) {
      summaries.set(key, {
        programId: key,
        programName,
        registrations: 0,
        confirmed: 0,
        pending: 0,
        waitlisted: 0,
        cancelled: 0,
        paidAmount: 0,
        unpaidAmount: 0,
      })
    }
    const s = summaries.get(key)!

    s.registrations += 1
    const status = (row.status || '').toLowerCase()
    if (status === 'confirmed') s.confirmed += 1
    else if (status === 'pending') s.pending += 1
    else if (status === 'waitlisted') s.waitlisted += 1
    else if (status === 'cancelled') s.cancelled += 1

    const paymentStatus = (row.payment_status || '').toLowerCase()
    const amt = Number(row.amount_paid || 0)
    if (paymentStatus === 'paid') {
      s.paidAmount += amt
    } else {
      s.unpaidAmount += amt
    }
  })

  const result = Array.from(summaries.values()).sort((a, b) =>
    a.programName.localeCompare(b.programName),
  )

  return NextResponse.json({ bySport: result })
}
