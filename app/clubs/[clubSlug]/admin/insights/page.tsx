'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Users, BarChart3, TrendingUp, ArrowRight } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin-page-header'
import { ClubIntelligenceWidget } from '@/components/club-intelligence-widget'
import { useRequireAdmin } from '@/lib/auth-context'

const COACH_CHIPS = [
  { label: "Who hasn't paid?", q: 'Which athletes have unpaid registrations?' },
  { label: 'Missing waivers', q: 'Which athletes are missing required waivers?' },
  { label: 'Revenue by program', q: 'Show me revenue broken down by program this season' },
  { label: 'Enrollment trends', q: 'Which programs have grown or declined vs last season?' },
  { label: 'Low-enrollment programs', q: 'Which programs are below 60% capacity?' },
  { label: 'Coach activity', q: 'Which coaches haven\'t sent any messages this season?' },
]

export default function AdminInsightsPage() {
  const params = useParams()
  const clubSlug = params.clubSlug as string
  const basePath = `/clubs/${clubSlug}/admin`
  const { profile, loading: authLoading } = useRequireAdmin()
  const [aiEnabled, setAiEnabled] = useState(false)

  useEffect(() => {
    fetch('/api/admin/ai/toggle')
      .then((r) => r.json())
      .then((data) => setAiEnabled(data.ai_enabled && data.ai_insights_enabled))
      .catch(() => {})
  }, [])

  if (authLoading || !profile) return null

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Insights"
        description="AI-powered intelligence and analytics for your club."
      />

      {/* AI Intelligence Widget */}
      {aiEnabled ? (
        <ClubIntelligenceWidget
          summaryEndpoint="/api/admin/ai/insights"
          chatEndpoint="/api/admin/ai/insights/chat"
          chips={COACH_CHIPS}
          title="Club Intelligence"
        />
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-8 text-center">
          <p className="text-sm text-zinc-400">AI features are not enabled for your club.</p>
          <Link
            href={`${basePath}/settings/ai`}
            className="mt-2 inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400"
          >
            Enable in Settings <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Analytics sub-sections */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Analytics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={`${basePath}/analytics/athletes`}
            className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-700 transition-colors">
              <Users className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Athlete Analytics</p>
              <p className="text-xs text-zinc-500 mt-0.5">Age, gender, program breakdown</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
          </Link>

          <Link
            href={`${basePath}/analytics/programs`}
            className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-700 transition-colors">
              <BarChart3 className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Program Analytics</p>
              <p className="text-xs text-zinc-500 mt-0.5">Enrollment, revenue, fill rates</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
          </Link>

          <Link
            href={`${basePath}/reports`}
            className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-700 transition-colors">
              <TrendingUp className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Reports</p>
              <p className="text-xs text-zinc-500 mt-0.5">Export and summary reports</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  )
}
