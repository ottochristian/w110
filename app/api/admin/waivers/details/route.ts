import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/server'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type WaiverDetail = {
  waiverId: string
  title: string
  required: boolean
  totalAthletes: number
  signedCount: number
  signedPercentage: number
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
    // 1. Get all waivers for this season
    const { data: waivers, error: waiversError } = await admin
      .from('waivers')
      .select('id, title, required, status')
      .eq('club_id', clubIdToUse)
      .eq('season_id', seasonId)
      .eq('status', 'active')
      .order('required', { ascending: false })
      .order('title', { ascending: true })

    if (waiversError) throw waiversError

    if (!waivers || waivers.length === 0) {
      return NextResponse.json([])
    }

    // 2. Get total athletes in this season
    const { data: registrations, error: registrationsError } = await admin
      .from('registrations')
      .select('athlete_id')
      .eq('season_id', seasonId)
      .eq('club_id', clubIdToUse)

    if (registrationsError) throw registrationsError

    const uniqueAthleteIds = Array.from(
      new Set((registrations || []).map((r: any) => r.athlete_id))
    )
    const totalAthletes = uniqueAthleteIds.length

    // 3. Get signature counts for each waiver
    const waiverIds = waivers.map((w: any) => w.id)
    
    const { data: signatures, error: signaturesError } = await admin
      .from('waiver_signatures')
      .select('waiver_id, athlete_id')
      .in('waiver_id', waiverIds)
      .in('athlete_id', uniqueAthleteIds)

    if (signaturesError) throw signaturesError

    // 4. Count unique athletes per waiver
    const waiverSignatureCounts = new Map<string, Set<string>>()
    
    signatures?.forEach((sig: any) => {
      if (!waiverSignatureCounts.has(sig.waiver_id)) {
        waiverSignatureCounts.set(sig.waiver_id, new Set())
      }
      waiverSignatureCounts.get(sig.waiver_id)?.add(sig.athlete_id)
    })

    // 5. Build result
    const result: WaiverDetail[] = waivers.map((waiver: any) => {
      const signedAthletes = waiverSignatureCounts.get(waiver.id)
      const signedCount = signedAthletes ? signedAthletes.size : 0
      const signedPercentage = totalAthletes > 0 
        ? Math.round((signedCount / totalAthletes) * 100) 
        : 0

      return {
        waiverId: waiver.id,
        title: waiver.title,
        required: waiver.required,
        totalAthletes,
        signedCount,
        signedPercentage,
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Waiver details error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load waiver details' },
      { status: 500 }
    )
  }
}
