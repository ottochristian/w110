'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminPageHeader } from '@/components/admin-page-header'
import { ClubIntelligenceWidget } from '@/components/club-intelligence-widget'
import { Users, FileText, Calendar, MessageSquare } from 'lucide-react'
import { useSelectedSeason } from '@/lib/contexts/season-context'

type CoachStats = {
  totalAthletes: number
  waiversSigned: number
  waiversTotal: number
  upcomingEvents: number
  messagesSent: number
}

const COACH_CHIPS = [
  { label: 'Unsigned waivers', q: "Which athletes in my programs haven't signed the required waivers?" },
  { label: 'Upcoming events', q: 'What events do I have coming up in the next 2 weeks?' },
  { label: 'Outstanding payments', q: 'Which athletes in my programs have outstanding payments?' },
  { label: 'My athletes', q: 'How many athletes are in each of my programs?' },
]

export default function CoachInsightsPage() {
  const params = useParams()
  const clubSlug = params.clubSlug as string
  const selectedSeason = useSelectedSeason()
  const [supabase] = useState(() => createClient())

  const [stats, setStats] = useState<CoachStats | null>(null)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Check AI enabled
      const aiRes = await fetch('/api/coach/ai/insights').then((r) => r.json()).catch(() => ({}))
      setAiEnabled(aiRes.ai_enabled ?? false)

      const { data: coachRow } = await supabase
        .from('coaches')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!coachRow) { setLoading(false); return }

      const { data: assignments } = await supabase
        .from('coach_assignments')
        .select('sub_program_id, group_id')
        .eq('coach_id', coachRow.id)

      const spIds = [...new Set((assignments ?? []).filter((a) => a.sub_program_id).map((a) => a.sub_program_id as string))]
      const gIds = [...new Set((assignments ?? []).filter((a) => a.group_id).map((a) => a.group_id as string))]

      if (spIds.length === 0) { setLoading(false); return }

      const now = new Date()
      const twoWeeksAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [regsResult, eventsResult, messagesResult] = await Promise.all([
        supabase
          .from('registrations')
          .select('id, athletes(id)')
          .in('sub_program_id', spIds)
          .neq('status', 'cancelled'),

        gIds.length > 0
          ? supabase
              .from('events')
              .select('id', { count: 'exact', head: true })
              .in('group_id', gIds)
              .gte('start_at', now.toISOString())
              .lte('start_at', twoWeeksAhead)
          : Promise.resolve({ count: 0 }),

        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', user.id)
          .gte('sent_at', thirtyDaysAgo),
      ])

      const athleteIds = [...new Set(
        (regsResult.data ?? []).map((r: any) => {
          const a = Array.isArray(r.athletes) ? r.athletes[0] : r.athletes
          return a?.id
        }).filter(Boolean)
      )]

      // Waiver signatures
      let waiversSigned = 0
      if (selectedSeason?.id && athleteIds.length > 0) {
        const { data: waivers } = await supabase
          .from('waivers')
          .select('id')
          .eq('season_id', selectedSeason.id)
          .eq('required', true)
        const waiverIds = (waivers ?? []).map((w: { id: string }) => w.id)
        if (waiverIds.length > 0) {
          const { data: sigs } = await supabase
            .from('waiver_signatures')
            .select('athlete_id')
            .in('waiver_id', waiverIds)
            .in('athlete_id', athleteIds as string[])
          waiversSigned = new Set((sigs ?? []).map((s: { athlete_id: string }) => s.athlete_id)).size
        }
      }

      setStats({
        totalAthletes: athleteIds.length,
        waiversSigned,
        waiversTotal: athleteIds.length,
        upcomingEvents: (eventsResult as any).count ?? 0,
        messagesSent: (messagesResult as any).count ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [supabase, selectedSeason?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const waiverPct = stats && stats.waiversTotal > 0
    ? Math.round((stats.waiversSigned / stats.waiversTotal) * 100)
    : null

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Insights"
        description="AI-powered overview of your programs and athletes."
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800 rounded-xl overflow-hidden ring-1 ring-zinc-800">
        <StatCard
          label="Athletes"
          value={loading ? null : stats?.totalAthletes ?? 0}
          sub="in your programs"
          icon={<Users className="h-3.5 w-3.5 text-zinc-600" />}
        />
        <StatCard
          label="Waivers"
          value={loading ? null : stats?.waiversSigned ?? 0}
          sub={waiverPct !== null ? `${waiverPct}% completion` : 'signed'}
          icon={<FileText className="h-3.5 w-3.5 text-zinc-600" />}
          highlight={waiverPct !== null && waiverPct < 70}
        />
        <StatCard
          label="Upcoming"
          value={loading ? null : stats?.upcomingEvents ?? 0}
          sub="events next 2 weeks"
          icon={<Calendar className="h-3.5 w-3.5 text-zinc-600" />}
        />
        <StatCard
          label="Messages"
          value={loading ? null : stats?.messagesSent ?? 0}
          sub="sent last 30 days"
          icon={<MessageSquare className="h-3.5 w-3.5 text-zinc-600" />}
        />
      </div>

      {/* AI Intelligence */}
      {aiEnabled ? (
        <ClubIntelligenceWidget
          summaryEndpoint="/api/coach/ai/insights"
          chatEndpoint="/api/coach/ai/chat"
          chips={COACH_CHIPS}
          title="My Program Intelligence"
        />
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-8 text-center">
          <p className="text-sm text-zinc-400">AI features are not enabled for your club.</p>
          <p className="text-xs text-zinc-600 mt-1">Ask your club admin to enable AI in Settings.</p>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon,
  highlight = false,
}: {
  label: string
  value: number | null
  sub: string
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className="bg-zinc-900 px-5 py-5">
      <div className="flex items-start justify-between mb-4">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      {value === null ? (
        <div className="h-8 w-16 animate-pulse rounded bg-zinc-800" />
      ) : (
        <p className={`metric-value ${highlight ? 'text-amber-400' : 'text-foreground'}`}>
          {value.toLocaleString()}
        </p>
      )}
      <p className="text-xs text-zinc-400 mt-2">{sub}</p>
    </div>
  )
}
