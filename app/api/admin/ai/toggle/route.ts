import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createSupabaseAdminClient as createAdminClient } from '@/lib/supabase-server'

// GET — return current ai_enabled status for the club
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult
  const { profile } = authResult

  const admin = createAdminClient()
  const clubId = profile.club_id

  if (!clubId) {
    return NextResponse.json({ error: 'No club associated with your account' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('clubs')
    .select('id, name, ai_enabled, ai_auto_briefing')
    .eq('id', clubId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Club not found' }, { status: 404 })
  }

  // Also return monthly usage stats
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: usage } = await admin
    .from('ai_usage')
    .select('feature, prompt_tokens, completion_tokens, created_at')
    .eq('club_id', clubId)
    .gte('created_at', startOfMonth.toISOString())

  const totalRequests = usage?.length ?? 0
  const totalTokens = usage?.reduce(
    (sum, u) => sum + u.prompt_tokens + u.completion_tokens,
    0
  ) ?? 0

  return NextResponse.json({
    ai_enabled: data.ai_enabled,
    ai_auto_briefing: data.ai_auto_briefing ?? false,
    usage_this_month: { requests: totalRequests, tokens: totalTokens },
  })
}

// POST — toggle ai_enabled for the club
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult
  const { profile } = authResult

  // Parse body once
  let body: { enabled?: boolean; club_id?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: '`enabled` (boolean) is required' }, { status: 400 })
  }
  const enabled = body.enabled

  // System admins must supply club_id; regular admins use their own
  let clubId = profile.club_id
  if (profile.role === 'system_admin') {
    if (!body.club_id) {
      return NextResponse.json({ error: 'club_id required for system admin' }, { status: 400 })
    }
    clubId = body.club_id
  }

  if (!clubId) {
    return NextResponse.json({ error: 'No club associated with your account' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('clubs')
    .update({ ai_enabled: enabled })
    .eq('id', clubId)
    .select('id, name, ai_enabled')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update club' }, { status: 500 })
  }

  return NextResponse.json({ ai_enabled: data.ai_enabled })
}

// PATCH — toggle ai_auto_briefing for the club
export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult
  const { profile } = authResult

  let body: { ai_auto_briefing?: boolean } = {}
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (typeof body.ai_auto_briefing !== 'boolean') {
    return NextResponse.json({ error: '`ai_auto_briefing` (boolean) is required' }, { status: 400 })
  }

  const clubId = profile.club_id
  if (!clubId) return NextResponse.json({ error: 'No club' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('clubs')
    .update({ ai_auto_briefing: body.ai_auto_briefing })
    .eq('id', clubId)
    .select('ai_auto_briefing')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })

  return NextResponse.json({ ai_auto_briefing: data.ai_auto_briefing })
}
