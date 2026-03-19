import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/api-auth'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// GET — return cached summary from club_insights
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult
  const { profile } = authResult

  const clubId = profile.club_id
  if (!clubId) {
    return NextResponse.json({ error: 'No club associated with your account' }, { status: 403 })
  }

  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('club_insights')
    .select('summary_text, generated_at, season_id')
    .eq('club_id', clubId)
    .single()

  if (!data) {
    return NextResponse.json({ summary_text: null, is_stale: true })
  }

  const today = new Date().toISOString().split('T')[0]
  const generatedDay = data.generated_at ? data.generated_at.split('T')[0] : null
  const isStale = generatedDay !== today

  return NextResponse.json({
    summary_text: data.summary_text,
    generated_at: data.generated_at,
    season_id: data.season_id,
    is_stale: isStale,
  })
}

// POST — generate a new weekly summary, stream it, then upsert to club_insights
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult
  const { profile } = authResult

  const clubId = profile.club_id
  if (!clubId) {
    return NextResponse.json({ error: 'No club associated with your account' }, { status: 403 })
  }

  const admin = createSupabaseAdminClient()

  // Verify ai_enabled and ai_insights_enabled
  const { data: club } = await admin
    .from('clubs')
    .select('id, name, ai_enabled, ai_insights_enabled')
    .eq('id', clubId)
    .single()

  if (!club?.ai_enabled) {
    return NextResponse.json(
      { error: 'AI features are not enabled for your club.' },
      { status: 403 }
    )
  }
  if (!club?.ai_insights_enabled) {
    return NextResponse.json(
      { error: 'Club Intelligence is not enabled for your club.' },
      { status: 403 }
    )
  }

  // Fetch current active season
  const { data: currentSeason } = await admin
    .from('seasons')
    .select('id, name')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  const seasonId = currentSeason?.id ?? null
  const seasonName = currentSeason?.name ?? 'Unknown Season'

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Gather data in parallel
  const [
    recentRegsResult,
    ordersResult,
    paymentsResult,
    activeAthletesResult,
    upcomingEventsResult,
    waiversResult,
    waiversSignedResult,
  ] = await Promise.all([
    // Recent registrations (last 7 days) with program info
    admin
      .from('registrations')
      .select('id, status, created_at, athletes(first_name, last_name), sub_programs(name, programs(name))')
      .eq('club_id', clubId)
      .gte('created_at', sevenDaysAgo),

    // Orders last 7 days
    admin
      .from('orders')
      .select('id, total_amount, status, created_at')
      .eq('club_id', clubId)
      .gte('created_at', sevenDaysAgo),

    // Payments last 7 days via orders
    admin
      .from('payments')
      .select('id, amount, status, order_id, orders!inner(club_id)')
      .eq('orders.club_id', clubId)
      .gte('created_at', sevenDaysAgo),

    // Active athletes this season grouped by program
    seasonId
      ? admin
          .from('registrations')
          .select('id, athletes(first_name, last_name), sub_programs(name, programs(name))')
          .eq('club_id', clubId)
          .eq('season_id', seasonId)
          .neq('status', 'cancelled')
      : Promise.resolve({ data: [] }),

    // Upcoming events next 7 days
    admin
      .from('events')
      .select('id, title, event_type, start_at, end_at')
      .eq('club_id', clubId)
      .gte('start_at', now.toISOString())
      .lte('start_at', sevenDaysAhead)
      .order('start_at', { ascending: true }),

    // Required waivers for season
    seasonId
      ? admin
          .from('waivers')
          .select('id, title')
          .eq('club_id', clubId)
          .eq('season_id', seasonId)
          .eq('is_required', true)
      : Promise.resolve({ data: [] }),

    // Waiver signatures for the season
    seasonId
      ? admin
          .from('waiver_signatures')
          .select('id, waiver_id, athlete_id')
          .in(
            'waiver_id',
            (await admin
              .from('waivers')
              .select('id')
              .eq('club_id', clubId)
              .eq('season_id', seasonId)
              .eq('is_required', true)
            ).data?.map((w: { id: string }) => w.id) ?? []
          )
      : Promise.resolve({ data: [] }),
  ])

  const recentRegs = recentRegsResult.data ?? []
  const orders = ordersResult.data ?? []
  const payments = paymentsResult.data ?? []
  const activeAthletes = activeAthletesResult.data ?? []
  const upcomingEvents = upcomingEventsResult.data ?? []
  const requiredWaivers = waiversResult.data ?? []
  const waiverSignatures = waiversSignedResult.data ?? []

  // Process data into facts
  const cancelledRegs = recentRegs.filter((r: { status: string }) => r.status === 'cancelled')

  // Count by program for recent registrations
  const regsByProgram: Record<string, number> = {}
  for (const reg of recentRegs) {
    const prog = (reg.sub_programs as { programs?: { name?: string } } | null)?.programs?.name ?? 'Unknown'
    regsByProgram[prog] = (regsByProgram[prog] ?? 0) + 1
  }

  // Order stats
  const totalRevenue = orders.reduce((sum: number, o: { total_amount: number }) => sum + (o.total_amount ?? 0), 0)
  const ordersByStatus: Record<string, number> = {}
  for (const o of orders) {
    const s = (o as { status: string }).status ?? 'unknown'
    ordersByStatus[s] = (ordersByStatus[s] ?? 0) + 1
  }

  // Payment stats
  const succeededPayments = payments.filter((p: { status: string }) => p.status === 'succeeded' || p.status === 'paid')
  const failedPayments = payments.filter((p: { status: string }) => p.status === 'failed')
  const totalPaymentAmount = succeededPayments.reduce((sum: number, p: { amount: number }) => sum + (p.amount ?? 0), 0)

  // Active athletes by program
  const athletesByProgram: Record<string, number> = {}
  for (const reg of activeAthletes) {
    const prog = (reg.sub_programs as { programs?: { name?: string } } | null)?.programs?.name ?? 'Unknown'
    athletesByProgram[prog] = (athletesByProgram[prog] ?? 0) + 1
  }

  // Waiver completion
  const uniqueAthletesSigned = new Set(waiverSignatures.map((s: { athlete_id: string }) => s.athlete_id)).size
  const totalActiveAthletes = activeAthletes.length
  const waiversOutstanding = Math.max(0, totalActiveAthletes - uniqueAthletesSigned)

  // Build structured data context
  const dataContext = `
Club: ${club.name}
Current Season: ${seasonName}
Report Period: Last 7 days (${new Date(sevenDaysAgo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})

REGISTRATIONS (last 7 days):
- Total new registrations: ${recentRegs.length}
- Cancelled: ${cancelledRegs.length}
- By program: ${Object.entries(regsByProgram).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}

ORDERS & REVENUE (last 7 days):
- Total orders: ${orders.length}
- Total revenue: $${(totalRevenue / 100).toFixed(2)}
- By status: ${Object.entries(ordersByStatus).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}

PAYMENTS (last 7 days):
- Succeeded: ${succeededPayments.length} ($${(totalPaymentAmount / 100).toFixed(2)})
- Failed: ${failedPayments.length}

ACTIVE ATHLETES (current season, non-cancelled):
- Total: ${totalActiveAthletes}
- By program: ${Object.entries(athletesByProgram).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}

WAIVERS (required, current season):
- Required waivers: ${requiredWaivers.length} (${requiredWaivers.map((w: { title: string }) => w.title).join(', ') || 'none'})
- Athletes who have signed at least one: ${uniqueAthletesSigned}
- Athletes with outstanding waivers: ${waiversOutstanding}

UPCOMING EVENTS (next 7 days):
${upcomingEvents.length === 0
  ? '- None scheduled'
  : upcomingEvents.map((ev: { title: string; event_type: string; start_at: string }) => {
      const dt = new Date(ev.start_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      return `- ${ev.title} (${ev.event_type}) — ${dt}`
    }).join('\n')
}
`.trim()

  const systemPrompt = `You are a club intelligence assistant generating a concise weekly summary for the admin of a ski club.
Write a professional admin report in plain text with 3-5 short sections.
Use this exact structure:
## Overview
## Registrations & Revenue
## Athletes & Waivers
## Upcoming
## Action Items

Keep each section to 2-4 sentences or a short bulleted list. Be factual and specific — use the numbers provided. Do not invent data. Tone: professional, direct, useful to a club administrator.`

  const userPrompt = `Here is this week's club data:\n\n${dataContext}\n\nGenerate the weekly club intelligence summary.`

  const encoder = new TextEncoder()
  let fullText = ''

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }

        // Upsert to club_insights
        const { error: upsertError } = await admin
          .from('club_insights')
          .upsert(
            {
              club_id: clubId,
              season_id: seasonId,
              summary_text: fullText,
              generated_at: new Date().toISOString(),
            },
            { onConflict: 'club_id' }
          )
        if (upsertError) console.error('[insights] upsert error:', upsertError)

        // Log usage
        const final = await stream.finalMessage()
        admin
          .from('ai_usage')
          .insert({
            club_id: clubId,
            user_id: profile.id,
            feature: 'club_insights',
            prompt_tokens: final.usage.input_tokens,
            completion_tokens: final.usage.output_tokens,
            model: 'claude-sonnet-4-6',
            metadata: { season_id: seasonId },
          })
          .then(({ error }: { error: unknown }) => { if (error) console.error('[insights] ai_usage insert:', error) })
      } catch (err) {
        console.error('[insights] stream error:', err)
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
