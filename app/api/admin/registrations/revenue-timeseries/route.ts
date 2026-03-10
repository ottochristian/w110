import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createClient, createAdminClient } from '@/lib/supabase/server'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type RevenuePoint = {
  date: string // YYYY-MM-DD
  paidAmount: number
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

  // Fetch paid registrations for the season/club
  const { data, error } = await supabase
    .from('registrations')
    .select(
      `
        amount_paid,
        payment_status,
        created_at,
        seasons!inner(club_id)
      `
    )
    .eq('season_id', seasonId)
    .eq('seasons.club_id', clubIdToUse)

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to load revenue timeseries' },
      { status: 500 }
    )
  }

  const points = new Map<string, number>() // date -> paidAmount

  ;(data || []).forEach((row: any) => {
    const paymentStatus = (row.payment_status || '').toLowerCase()
    if (paymentStatus !== 'paid') return

    const amt = Number(row.amount_paid || 0)
    const date = new Date(row.created_at)
    if (Number.isNaN(date.getTime())) return
    const key = date.toISOString().slice(0, 10) // YYYY-MM-DD
    points.set(key, (points.get(key) || 0) + amt)
  })

  const timeseries: RevenuePoint[] = Array.from(points.entries())
    .map(([date, paidAmount]) => ({ date, paidAmount }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ timeseries })
}
