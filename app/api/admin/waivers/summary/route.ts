import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/server'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type WaiverSummary = {
  totalRequired: number
  complianceRate: number
  athletesMissing: number
  totalSignatures: number
  recentSignatures: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seasonId = searchParams.get('seasonId')
  const requestedClubId = searchParams.get('clubId')
  const programId = searchParams.get('programId')

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
    // 1. Get total required waivers for this season
    const { data: requiredWaivers, error: waiversError } = await admin
      .from('waivers')
      .select('id')
      .eq('club_id', clubIdToUse)
      .eq('season_id', seasonId)
      .eq('required', true)
      .eq('status', 'active')

    if (waiversError) throw waiversError

    const totalRequired = requiredWaivers?.length || 0

    // 2. Get all athletes registered in this season (with optional program filter)
    let athletesQuery = admin
      .from('registrations')
      .select(`
        athlete_id,
        sub_programs!inner(
          id,
          program_id
        )
      `)
      .eq('season_id', seasonId)
      .eq('club_id', clubIdToUse)

    if (programId && programId !== 'all') {
      athletesQuery = athletesQuery.eq('sub_programs.program_id', programId)
    }

    const { data: registrations, error: registrationsError } = await athletesQuery

    if (registrationsError) throw registrationsError

    const uniqueAthleteIds = Array.from(
      new Set((registrations || []).map((r: any) => r.athlete_id))
    )

    const totalAthletes = uniqueAthleteIds.length

    // 3. If no required waivers, everyone is compliant
    if (totalRequired === 0 || totalAthletes === 0) {
      return NextResponse.json({
        totalRequired: 0,
        complianceRate: 100,
        athletesMissing: 0,
        totalSignatures: 0,
        recentSignatures: 0,
      })
    }

    // 4. Check which athletes have signed ALL required waivers
    const requiredWaiverIds = requiredWaivers.map((w: any) => w.id)

    const { data: signatures, error: signaturesError } = await admin
      .from('waiver_signatures')
      .select('athlete_id, waiver_id')
      .in('athlete_id', uniqueAthleteIds)
      .in('waiver_id', requiredWaiverIds)

    if (signaturesError) throw signaturesError

    // Count athletes who signed ALL required waivers
    const athleteSignatureCounts = new Map<string, Set<string>>()
    
    signatures?.forEach((sig: any) => {
      if (!athleteSignatureCounts.has(sig.athlete_id)) {
        athleteSignatureCounts.set(sig.athlete_id, new Set())
      }
      athleteSignatureCounts.get(sig.athlete_id)?.add(sig.waiver_id)
    })

    let compliantAthletes = 0
    uniqueAthleteIds.forEach((athleteId) => {
      const signedWaivers = athleteSignatureCounts.get(athleteId)
      if (signedWaivers && signedWaivers.size === totalRequired) {
        compliantAthletes++
      }
    })

    const athletesMissing = totalAthletes - compliantAthletes
    const complianceRate = totalAthletes > 0 
      ? Math.round((compliantAthletes / totalAthletes) * 100) 
      : 100

    // 5. Get all waiver IDs for this season/club
    const { data: allWaivers, error: allWaiversError } = await admin
      .from('waivers')
      .select('id')
      .eq('club_id', clubIdToUse)
      .eq('season_id', seasonId)

    if (allWaiversError) throw allWaiversError

    const allWaiverIds = (allWaivers || []).map((w: any) => w.id)

    // 6. Get total signature count (all waivers, not just required)
    const { data: allSignatures, error: allSigError } = await admin
      .from('waiver_signatures')
      .select('id, signed_at, waiver_id')
      .in('athlete_id', uniqueAthleteIds)
      .in('waiver_id', allWaiverIds)

    if (allSigError) throw allSigError

    const totalSignatures = allSignatures?.length || 0

    // 7. Get signatures from last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentSignatures = allSignatures?.filter((sig: any) => 
      new Date(sig.signed_at) >= sevenDaysAgo
    ).length || 0

    return NextResponse.json({
      totalRequired,
      complianceRate,
      athletesMissing,
      totalSignatures,
      recentSignatures,
    })
  } catch (error: any) {
    console.error('Waiver summary error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load waiver summary' },
      { status: 500 }
    )
  }
}
