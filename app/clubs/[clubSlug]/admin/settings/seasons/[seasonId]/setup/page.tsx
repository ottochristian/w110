'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSeasonReadiness } from '@/lib/hooks/use-season-readiness'
import { useSeason } from '@/lib/contexts/season-context'
import { CheckCircle2, Circle, ArrowRight, RefreshCw, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SeasonSetupPage() {
  const params = useParams()
  const router = useRouter()
  const clubSlug = params.clubSlug as string
  const seasonId = params.seasonId as string

  const { selectedSeason } = useSeason()

  // When the global season selector changes, navigate to that season's setup page
  useEffect(() => {
    if (selectedSeason && selectedSeason.id !== seasonId) {
      router.replace(`/clubs/${clubSlug}/admin/settings/seasons/${selectedSeason.id}/setup`)
    }
  }, [selectedSeason, seasonId, clubSlug, router])

  const basePath = `/clubs/${clubSlug}/admin`
  const { data, isLoading, error, refetch } = useSeasonReadiness(seasonId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading setup checklist…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-red-500">Failed to load setup checklist.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    )
  }

  const { season, steps, completedCount, totalCount, isComplete } = data
  const requiredSteps = steps.filter((s) => !s.optional)
  const optionalSteps = steps.filter((s) => s.optional)
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="flex flex-col gap-8">
      {/* Back */}
      <Link
        href={`${basePath}/settings/seasons`}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Back to Seasons
      </Link>

      {/* Header */}
      <div>
        <h1 className="page-title">Season Setup</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{season.name}</p>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              {isComplete ? 'Setup complete — registration is open!' : `${completedCount} of ${totalCount} steps complete`}
            </span>
            <span className="text-sm font-semibold tabular-nums">{progressPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-orange-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {isComplete && (
            <p className="text-xs text-emerald-600 mt-3 font-medium">
              Your season is active. Parents can now register athletes.
            </p>
          )}
        </div>
      </div>

      {/* Required Steps */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">Required steps</h3>
        </div>
        <div className="divide-y divide-border">
          {requiredSteps.map((step, idx) => (
            <div key={step.id} className="flex items-start gap-4 px-5 py-4">
              {/* Status icon */}
              <div className="mt-0.5 flex-shrink-0">
                {step.complete ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                ) : (
                  <Circle className="w-4.5 h-4.5 text-muted-foreground/40" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Step {idx + 1}
                  </span>
                  {step.complete && (
                    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-green-950/30 text-green-400 ring-1 ring-inset ring-green-900/50">
                      Done
                    </span>
                  )}
                </div>
                <p className={`text-sm font-medium mt-0.5 ${step.complete ? 'text-muted-foreground line-through decoration-muted-foreground/50' : ''}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                {step.count !== undefined && step.total !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    {step.count} of {step.total} set
                  </p>
                )}
                {step.count !== undefined && step.total === undefined && (
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{step.count} added</p>
                )}
              </div>

              {/* Action */}
              {!step.complete && (
                <Link
                  href={`${basePath}/${step.href}`}
                  className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-400 transition-colors mt-1"
                >
                  Go
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Optional Steps */}
      {optionalSteps.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Optional</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Recommended but not required to open registration</p>
          </div>
          <div className="divide-y divide-border">
            {optionalSteps.map((step) => (
              <div key={step.id} className="flex items-start gap-4 px-5 py-4">
                <div className="mt-0.5 flex-shrink-0">
                  {step.complete ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                  ) : (
                    <Circle className="w-4.5 h-4.5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${step.complete ? 'text-muted-foreground line-through decoration-muted-foreground/50' : ''}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  {step.count !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{step.count} added</p>
                  )}
                </div>
                {!step.complete && (
                  <Link
                    href={`${basePath}/${step.href}`}
                    className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-400 transition-colors mt-1"
                  >
                    Go
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh */}
      <div className="flex justify-end">
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh checklist
        </button>
      </div>
    </div>
  )
}
