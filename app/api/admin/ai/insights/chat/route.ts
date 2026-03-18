import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/api-auth'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type MessageParam = { role: 'user' | 'assistant'; content: string }

const tools: Anthropic.Tool[] = [
  {
    name: 'get_registrations',
    description: 'Get registration counts and details. Can filter by days back (default 30) and optionally by program name.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'How many days back to look (default 30)' },
        program_name: { type: 'string', description: 'Optional: filter by program name (partial match)' },
      },
    },
  },
  {
    name: 'get_payment_summary',
    description: 'Get payment totals, success/failure counts, and any failed payments with athlete info.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'How many days back to look (default 30)' },
      },
    },
  },
  {
    name: 'get_athletes_by_program',
    description: 'Get athlete counts and names broken down by program and sub-program for the current season.',
    input_schema: {
      type: 'object' as const,
      properties: {
        program_name: { type: 'string', description: 'Optional: filter by program name (partial match)' },
      },
    },
  },
  {
    name: 'get_waiver_status',
    description: 'Get waiver completion status — how many athletes have signed required waivers vs outstanding.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_upcoming_events',
    description: 'Get upcoming scheduled events and training sessions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'How many days forward to look (default 14)' },
      },
    },
  },
]

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  clubId: string,
  seasonId: string | null
): Promise<string> {
  const admin = createSupabaseAdminClient()
  const now = new Date()

  if (name === 'get_registrations') {
    const days = typeof input.days === 'number' ? input.days : 30
    const programName = typeof input.program_name === 'string' ? input.program_name : null
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

    let query = admin
      .from('registrations')
      .select('id, status, payment_status, created_at, athletes(first_name, last_name), sub_programs(name, programs(name))')
      .eq('club_id', clubId)
      .gte('created_at', since)

    const { data } = await query
    const regs: any[] = data ?? []

    let filtered: any[] = regs
    if (programName) {
      filtered = regs.filter((r: any) => {
        const prog = (r.sub_programs as { programs?: { name?: string } } | null)?.programs?.name ?? ''
        const sub = (r.sub_programs as { name?: string } | null)?.name ?? ''
        const search = programName.toLowerCase()
        return prog.toLowerCase().includes(search) || sub.toLowerCase().includes(search)
      })
    }

    const byStatus: Record<string, number> = {}
    const byProgram: Record<string, number> = {}
    for (const r of filtered) {
      byStatus[(r as { status: string }).status] = (byStatus[(r as { status: string }).status] ?? 0) + 1
      const prog = (r.sub_programs as { programs?: { name?: string } } | null)?.programs?.name ?? 'Unknown'
      byProgram[prog] = (byProgram[prog] ?? 0) + 1
    }

    return JSON.stringify({
      total: filtered.length,
      days_back: days,
      program_filter: programName,
      by_status: byStatus,
      by_program: byProgram,
      sample: filtered.slice(0, 10).map((r) => ({
        athlete: `${(r.athletes as { first_name?: string; last_name?: string } | null)?.first_name ?? ''} ${(r.athletes as { first_name?: string; last_name?: string } | null)?.last_name ?? ''}`.trim(),
        program: (r.sub_programs as { programs?: { name?: string } } | null)?.programs?.name,
        sub_program: (r.sub_programs as { name?: string } | null)?.name,
        status: (r as { status: string }).status,
        created_at: (r as { created_at: string }).created_at,
      })),
    })
  }

  if (name === 'get_payment_summary') {
    const days = typeof input.days === 'number' ? input.days : 30
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: orders } = await admin
      .from('orders')
      .select('id, total_amount, status, created_at')
      .eq('club_id', clubId)
      .gte('created_at', since)

    const ordersData = orders ?? []
    const orderIds = ordersData.map((o: { id: string }) => o.id)

    const { data: payments } = orderIds.length > 0
      ? await admin
          .from('payments')
          .select('id, amount, status, order_id, processed_at')
          .in('order_id', orderIds)
      : { data: [] }

    const paymentsData = payments ?? []
    const succeeded = paymentsData.filter((p: { status: string }) => p.status === 'succeeded' || p.status === 'paid')
    const failed = paymentsData.filter((p: { status: string }) => p.status === 'failed')
    const totalCollected = succeeded.reduce((sum: number, p: { amount: number }) => sum + (p.amount ?? 0), 0)
    const totalOrders = ordersData.reduce((sum: number, o: { total_amount: number }) => sum + (o.total_amount ?? 0), 0)

    return JSON.stringify({
      days_back: days,
      orders: {
        total: ordersData.length,
        total_value_cents: totalOrders,
        total_value_dollars: (totalOrders / 100).toFixed(2),
      },
      payments: {
        total: paymentsData.length,
        succeeded: succeeded.length,
        failed: failed.length,
        collected_cents: totalCollected,
        collected_dollars: (totalCollected / 100).toFixed(2),
      },
    })
  }

  if (name === 'get_athletes_by_program') {
    const programName = typeof input.program_name === 'string' ? input.program_name : null

    let query = admin
      .from('registrations')
      .select('id, athletes(first_name, last_name), sub_programs(name, programs(name))')
      .eq('club_id', clubId)
      .neq('status', 'cancelled')

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data } = await query
    const regs: any[] = data ?? []

    let filtered: any[] = regs
    if (programName) {
      filtered = regs.filter((r: any) => {
        const prog = (r.sub_programs as { programs?: { name?: string } } | null)?.programs?.name ?? ''
        const sub = (r.sub_programs as { name?: string } | null)?.name ?? ''
        const search = programName.toLowerCase()
        return prog.toLowerCase().includes(search) || sub.toLowerCase().includes(search)
      })
    }

    // Group by program > sub_program
    const grouped: Record<string, Record<string, string[]>> = {}
    for (const r of filtered) {
      const prog = (r.sub_programs as { programs?: { name?: string } } | null)?.programs?.name ?? 'Unknown'
      const sub = (r.sub_programs as { name?: string } | null)?.name ?? 'Unknown'
      const athlete = `${(r.athletes as { first_name?: string; last_name?: string } | null)?.first_name ?? ''} ${(r.athletes as { first_name?: string; last_name?: string } | null)?.last_name ?? ''}`.trim()
      if (!grouped[prog]) grouped[prog] = {}
      if (!grouped[prog][sub]) grouped[prog][sub] = []
      grouped[prog][sub].push(athlete)
    }

    // Summarise (cap names at 10 per group)
    const summary: Record<string, { total: number; sub_programs: Record<string, { count: number; athletes: string[] }> }> = {}
    for (const [prog, subs] of Object.entries(grouped)) {
      summary[prog] = { total: 0, sub_programs: {} }
      for (const [sub, names] of Object.entries(subs)) {
        summary[prog].sub_programs[sub] = { count: names.length, athletes: names.slice(0, 10) }
        summary[prog].total += names.length
      }
    }

    return JSON.stringify({ total_athletes: filtered.length, by_program: summary })
  }

  if (name === 'get_waiver_status') {
    if (!seasonId) {
      return JSON.stringify({ error: 'No active season found' })
    }

    const { data: waivers } = await admin
      .from('waivers')
      .select('id, title, is_required')
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .eq('is_required', true)

    const waiversData = waivers ?? []
    const waiverIds = waiversData.map((w: { id: string }) => w.id)

    const { data: signatures } = waiverIds.length > 0
      ? await admin
          .from('waiver_signatures')
          .select('id, waiver_id, athlete_id')
          .in('waiver_id', waiverIds)
      : { data: [] }

    const sigsData = signatures ?? []
    const signedAthletes = new Set(sigsData.map((s: { athlete_id: string }) => s.athlete_id))

    // Total active athletes
    const { count: activeCount } = await admin
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .neq('status', 'cancelled')

    const totalAthletes = activeCount ?? 0
    const signed = signedAthletes.size
    const outstanding = Math.max(0, totalAthletes - signed)

    return JSON.stringify({
      required_waivers: waiversData.map((w: { id: string; title: string }) => ({ id: w.id, title: w.title })),
      total_active_athletes: totalAthletes,
      athletes_signed: signed,
      athletes_outstanding: outstanding,
      total_signatures: sigsData.length,
    })
  }

  if (name === 'get_upcoming_events') {
    const days = typeof input.days === 'number' ? input.days : 14
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()

    let query = admin
      .from('events')
      .select('id, title, event_type, start_at, end_at')
      .eq('club_id', clubId)
      .gte('start_at', now.toISOString())
      .lte('start_at', until)
      .order('start_at', { ascending: true })

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data } = await query
    const events = data ?? []

    return JSON.stringify({
      days_forward: days,
      total: events.length,
      events: events.map((ev: { title: string; event_type: string; start_at: string; end_at: string | null }) => ({
        title: ev.title,
        type: ev.event_type,
        start: ev.start_at,
        end: ev.end_at,
        formatted: new Date(ev.start_at).toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        }),
      })),
    })
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` })
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult
  const { profile } = authResult

  const clubId = profile.club_id
  if (!clubId) {
    return NextResponse.json({ error: 'No club associated with your account' }, { status: 403 })
  }

  let body: { messages: MessageParam[]; season_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // Verify ai_enabled and ai_insights_enabled
  const { data: club } = await admin
    .from('clubs')
    .select('name, ai_enabled, ai_insights_enabled')
    .eq('id', clubId)
    .single()

  if (!club?.ai_enabled || !club?.ai_insights_enabled) {
    return NextResponse.json({ error: 'Club Intelligence is not enabled.' }, { status: 403 })
  }

  // Resolve season_id: prefer explicit param, fall back to active season
  let seasonId: string | null = body.season_id ?? null
  if (!seasonId) {
    const { data: season } = await admin
      .from('seasons')
      .select('id')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .single()
    seasonId = season?.id ?? null
  }

  const systemPrompt = `You are a club intelligence assistant for ${club.name}, a ski club.
You have access to tools that can query the club's data including registrations, payments, athletes, waivers, and events.
Give concise, factual answers. Never make up data — always use the tools to look things up.
When answering questions, be specific with numbers and names where relevant.
Keep responses professional and suited for a club administrator.`

  const messages: Anthropic.MessageParam[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  let iteration = 0
  const maxIterations = 5
  let finalText = ''

  while (iteration < maxIterations) {
    iteration++

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      tools,
      messages,
    })

    if (response.stop_reason === 'end_turn') {
      // Extract text from response
      for (const block of response.content) {
        if (block.type === 'text') {
          finalText += block.text
        }
      }
      break
    }

    if (response.stop_reason === 'tool_use') {
      // Add assistant's response (including tool_use blocks) to messages
      messages.push({ role: 'assistant', content: response.content })

      // Execute all tool calls and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            clubId,
            seasonId
          )
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          })
        }
      }

      // Add tool results as user message
      messages.push({ role: 'user', content: toolResults })
      continue
    }

    // Unexpected stop reason — extract whatever text is there
    for (const block of response.content) {
      if (block.type === 'text') finalText += block.text
    }
    break
  }

  if (!finalText) {
    finalText = 'I was unable to generate a response. Please try again.'
  }

  // Log usage (best-effort)
  admin
    .from('ai_usage')
    .insert({
      club_id: clubId,
      user_id: profile.id,
      feature: 'club_insights_chat',
      prompt_tokens: 0,
      completion_tokens: 0,
      model: 'claude-sonnet-4-6',
      metadata: { season_id: seasonId, iterations: iteration },
    })
    .then(({ error }: { error: unknown }) => { if (error) console.error('[insights/chat] ai_usage insert:', error) })

  return NextResponse.json({ message: finalText })
}
