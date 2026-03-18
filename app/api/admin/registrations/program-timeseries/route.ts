import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createClient, createAdminClient } from '@/lib/supabase/server'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type SignupPoint = {
  date: string // YYYY-MM-DD
  programId: string
  programName: string
  count: number
}

type RevenuePoint = {
  date: string // YYYY-MM-DD
  programId: string
  programName: string
  paidAmount: number
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const seasonId = searchParams.get('seasonId')
    const requestedClubId = searchParams.get('clubId')

    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, club_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = profile.role as ProfileRole
    const isSystemAdmin = role === 'system_admin'
    const clubIdToUse = isSystemAdmin ? requestedClubId : profile.club_id

    if (!clubIdToUse) {
      return NextResponse.json(
        { error: 'clubId is required (admins use profile club; system admins must pass clubId)' },
        { status: 400 }
      )
    }

    if (!isSystemAdmin && clubIdToUse !== profile.club_id) {
      return NextResponse.json({ error: 'Forbidden: club mismatch' }, { status: 403 })
    }

    if (isSystemAdmin && !requestedClubId) {
      return NextResponse.json({ error: 'clubId is required for system admins' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('registrations')
      .select(
        `
          created_at,
          payment_status,
          amount_paid,
          sub_programs!inner(program_id, programs(name)),
          seasons!inner(club_id)
        `
      )
      .eq('season_id', seasonId)
      .eq('seasons.club_id', clubIdToUse)

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to load program timeseries' },
        { status: 500 }
      )
    }

    const signupsMap = new Map<string, SignupPoint>() // key: date|programId
    const revenueMap = new Map<string, RevenuePoint>() // key: date|programId

    ;(data || []).forEach((row: any) => {
      const programId = row.sub_programs?.program_id as string | undefined
      if (!programId) return
      const programName = row.sub_programs?.programs?.name || 'Unknown program'
      const dt = new Date(row.created_at)
      if (Number.isNaN(dt.getTime())) return
      const dateKey = dt.toISOString().slice(0, 10)
      const k = `${dateKey}|${programId}`

      // signups count
      if (!signupsMap.has(k)) {
        signupsMap.set(k, { date: dateKey, programId, programName, count: 0 })
      }
      const s = signupsMap.get(k)!
      s.count += 1

      // revenue (paid only)
      const paymentStatus = (row.payment_status || '').toLowerCase()
      if (paymentStatus === 'paid') {
        if (!revenueMap.has(k)) {
          revenueMap.set(k, { date: dateKey, programId, programName, paidAmount: 0 })
        }
        const r = revenueMap.get(k)!
        r.paidAmount += Number(row.amount_paid || 0)
      }
    })

    const signups = Array.from(signupsMap.values()).sort((a, b) =>
      a.date === b.date ? a.programName.localeCompare(b.programName) : a.date.localeCompare(b.date)
    )
    const revenue = Array.from(revenueMap.values()).sort((a, b) =>
      a.date === b.date ? a.programName.localeCompare(b.programName) : a.date.localeCompare(b.date)
    )

    return NextResponse.json({ signups, revenue })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: 'Unexpected error loading program timeseries' },
      { status: 500 }
    )
  }
}
