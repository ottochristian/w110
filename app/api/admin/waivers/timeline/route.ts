import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/server'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type TimelinePoint = {
  date: string
  count: number
  cumulative: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seasonId = searchParams.get('seasonId')
  const requestedClubId = searchParams.get('clubId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

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
    return NextResponse.json({ error: 'seasonId is required' }, { status: 400 })
  }

  if (!clubIdToUse) {
    return NextResponse.json({ error: 'clubId is required' }, { status: 400 })
  }

  if (!isSystemAdmin && clubIdToUse !== profile.club_id) {
    return NextResponse.json({ error: 'Forbidden: club mismatch' }, { status: 403 })
  }

  if (isSystemAdmin && !requestedClubId) {
    return NextResponse.json({ error: 'clubId is required for system admins' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    // 1. Get season dates if start/end not provided
    let queryStartDate = startDate
    let queryEndDate = endDate

    if (!queryStartDate || !queryEndDate) {
      const { data: season, error: seasonError } = await admin
        .from('seasons')
        .select('start_date, end_date')
        .eq('id', seasonId)
        .single()

      if (seasonError) throw seasonError

      if (!queryStartDate) {
        queryStartDate = season.start_date
      }
      if (!queryEndDate) {
        queryEndDate = season.end_date || new Date().toISOString().split('T')[0]
      }
    }

    // 2. Get all waiver IDs for this season/club
    const { data: waivers, error: waiversError } = await admin
      .from('waivers')
      .select('id')
      .eq('club_id', clubIdToUse)
      .eq('season_id', seasonId)

    if (waiversError) throw waiversError

    const waiverIds = (waivers || []).map((w: any) => w.id)

    if (waiverIds.length === 0) {
      return NextResponse.json([])
    }

    // 3. Get all signatures in date range
    const { data: signatures, error: signaturesError } = await admin
      .from('waiver_signatures')
      .select('signed_at')
      .in('waiver_id', waiverIds)
      .gte('signed_at', `${queryStartDate}T00:00:00`)
      .lte('signed_at', `${queryEndDate}T23:59:59`)
      .order('signed_at', { ascending: true })

    if (signaturesError) throw signaturesError

    // 4. Group signatures by date
    const signaturesByDate = new Map<string, number>()
    
    signatures?.forEach((sig: any) => {
      const date = sig.signed_at.split('T')[0]
      signaturesByDate.set(date, (signaturesByDate.get(date) || 0) + 1)
    })

    // 5. Fill in missing dates and calculate cumulative
    const result: TimelinePoint[] = []
    let cumulative = 0
    
    const start = new Date(queryStartDate!)
    const end = new Date(queryEndDate!)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const count = signaturesByDate.get(dateStr) || 0
      cumulative += count
      
      result.push({
        date: dateStr,
        count,
        cumulative,
      })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Waiver timeline error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load waiver timeline' },
      { status: 500 }
    )
  }
}
