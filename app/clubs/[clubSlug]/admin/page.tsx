'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  BookOpen,
  FileText,
  DollarSign,
  Plus,
  ArrowRight,
  AlertCircle,
  Circle,
  Lock,
} from 'lucide-react'
import { useRequireAdmin } from '@/lib/auth-context'
import { useSelectedSeason } from '@/lib/contexts/season-context'
import { useAthletesCount } from '@/lib/hooks/use-athletes'
import { usePrograms } from '@/lib/hooks/use-programs'
import {
  useRegistrationsCount,
  useTotalRevenue,
  useRecentRegistrations,
} from '@/lib/hooks/use-registrations'
import { useSeasonReadiness } from '@/lib/hooks/use-season-readiness'
import { AdminPageHeader } from '@/components/admin-page-header'
import { InlineLoading } from '@/components/ui/loading-states'

function statusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'confirmed':  return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    case 'pending':    return 'bg-amber-50 text-amber-700 ring-amber-100'
    case 'waitlisted': return 'bg-zinc-100 text-zinc-600 ring-zinc-200'
    case 'cancelled':  return 'bg-red-50 text-red-600 ring-red-100'
    default:           return 'bg-zinc-100 text-zinc-600 ring-zinc-200'
  }
}

export default function AdminDashboard() {
  const params = useParams()
  const clubSlug = params.clubSlug as string
  const { profile, loading: authLoading } = useRequireAdmin()
  const selectedSeason = useSelectedSeason()

  const { data: totalAthletes = 0, isLoading: athletesLoading } = useAthletesCount(
    profile?.club_id || null,
    selectedSeason?.id || null
  )
  const { data: allPrograms = [], isLoading: programsLoading } = usePrograms(selectedSeason?.id)
  const programsCount = allPrograms.filter((p: any) => p.status === 'ACTIVE').length

  const { data: totalRegistrations = 0, isLoading: registrationsLoading } =
    useRegistrationsCount(selectedSeason?.id)
  const { data: totalRevenue = 0, isLoading: revenueLoading } = useTotalRevenue(selectedSeason?.id)
  const { data: recentRegistrations = [], isLoading: recentRegsLoading } =
    useRecentRegistrations(selectedSeason?.id || null, 6)

  const { data: readiness } = useSeasonReadiness(
    selectedSeason?.status === 'draft' ? selectedSeason?.id : null
  )

  const transformedRecentRegs = recentRegistrations.map((reg: any) => ({
    ...reg,
    athlete: reg.athletes,
    program: reg.sub_programs?.programs || { name: reg.sub_programs?.name || 'Unknown' },
  }))

  if (!authLoading && !profile) return null

  if (!authLoading && !selectedSeason) {
    const onboardingSteps = [
      {
        label: 'Create your first season',
        description: 'Define the date range and name for your upcoming season',
        href: `/clubs/${clubSlug}/admin/settings/seasons`,
        locked: false,
      },
      {
        label: 'Add programs',
        description: 'Create the programs athletes will register for',
        locked: true,
      },
      {
        label: 'Set pricing',
        description: 'Configure registration fees for each sub-program',
        locked: true,
      },
      {
        label: 'Open registration',
        description: 'Activate the season so parents can register their athletes',
        locked: true,
      },
    ]

    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Welcome to your club</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Let's get your first season set up so you can start accepting registrations.</p>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-50">
            <h3 className="text-sm font-semibold text-zinc-900">Getting started</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Complete these steps to open registration</p>
          </div>
          <div className="divide-y divide-zinc-50">
            {onboardingSteps.map((step, idx) => (
              <div key={idx} className={`flex items-start gap-4 px-5 py-4 ${step.locked ? 'opacity-40' : ''}`}>
                <div className="mt-0.5 flex-shrink-0">
                  {step.locked
                    ? <Lock className="w-4 h-4 text-zinc-300" />
                    : <Circle className="w-4 h-4 text-zinc-300" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Step {idx + 1}</span>
                  <p className="text-sm font-medium text-zinc-900 mt-0.5">{step.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{step.description}</p>
                </div>
                {!step.locked && step.href && (
                  <Link
                    href={step.href}
                    className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors mt-1"
                  >
                    Start
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const basePath = `/clubs/${clubSlug}/admin`

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Dashboard"
        description={selectedSeason ? `Season: ${selectedSeason.name}` : 'Overview of your ski program'}
        action={
          <Button asChild size="sm">
            <Link href={`${basePath}/programs/new`}>
              <Plus className="h-3.5 w-3.5" />
              New Program
            </Link>
          </Button>
        }
      />

      {/* Season Setup Banner — only when draft + incomplete */}
      {readiness && !readiness.isComplete && (
        <Link
          href={`${basePath}/settings/seasons/${selectedSeason?.id}/setup`}
          className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 hover:bg-amber-100/60 transition-colors group"
        >
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-amber-800">
              Season setup in progress —{' '}
            </span>
            <span className="text-sm text-amber-700">
              {readiness.completedCount} of {readiness.totalCount} steps complete
            </span>
          </div>
          <span className="text-xs font-medium text-amber-600 group-hover:text-amber-700 flex items-center gap-1 flex-shrink-0">
            View checklist
            <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      )}

      {/* Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-100 rounded-xl overflow-hidden ring-1 ring-zinc-100">
        {/* Athletes */}
        <div className="bg-white px-5 py-5">
          <div className="flex items-start justify-between mb-4">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Athletes</span>
            <Users className="h-3.5 w-3.5 text-zinc-300 mt-0.5" />
          </div>
          {athletesLoading ? (
            <div className="h-8 w-16 animate-pulse rounded bg-zinc-100" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
              {totalAthletes.toLocaleString()}
            </p>
          )}
          <p className="text-xs text-zinc-400 mt-2">enrolled this season</p>
        </div>

        {/* Programs */}
        <div className="bg-white px-5 py-5">
          <div className="flex items-start justify-between mb-4">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Programs</span>
            <BookOpen className="h-3.5 w-3.5 text-zinc-300 mt-0.5" />
          </div>
          {programsLoading ? (
            <div className="h-8 w-12 animate-pulse rounded bg-zinc-100" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
              {programsCount}
            </p>
          )}
          <p className="text-xs text-zinc-400 mt-2">active this season</p>
        </div>

        {/* Registrations */}
        <div className="bg-white px-5 py-5">
          <div className="flex items-start justify-between mb-4">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Registrations</span>
            <FileText className="h-3.5 w-3.5 text-zinc-300 mt-0.5" />
          </div>
          {registrationsLoading ? (
            <div className="h-8 w-16 animate-pulse rounded bg-zinc-100" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
              {totalRegistrations.toLocaleString()}
            </p>
          )}
          <p className="text-xs text-zinc-400 mt-2">total this season</p>
        </div>

        {/* Revenue */}
        <div className="bg-white px-5 py-5">
          <div className="flex items-start justify-between mb-4">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Revenue</span>
            <DollarSign className="h-3.5 w-3.5 text-zinc-300 mt-0.5" />
          </div>
          {revenueLoading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-zinc-100" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
              ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          )}
          <p className="text-xs text-zinc-400 mt-2">collected this season</p>
        </div>
      </div>

      {/* Content Row */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Quick Actions */}
        <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-50">
            <h3 className="text-sm font-semibold text-zinc-900">Quick Actions</h3>
          </div>
          <nav className="p-2">
            {[
              { href: `${basePath}/programs/new`, icon: BookOpen, label: 'New Program' },
              { href: `${basePath}/athletes/new`, icon: Users, label: 'Add Athlete' },
              { href: `${basePath}/registrations`, icon: FileText, label: 'View Registrations' },
              { href: `${basePath}/reports`, icon: DollarSign, label: 'Reports' },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md bg-zinc-50 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-100 transition-colors">
                    <Icon className="h-3.5 w-3.5 text-zinc-400" />
                  </div>
                  {label}
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-400 transition-colors" />
              </Link>
            ))}
          </nav>
        </div>

        {/* Recent Registrations */}
        <div className="md:col-span-2 rounded-xl border border-zinc-100 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Recent Registrations</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Latest athlete enrollments</p>
            </div>
            <Link
              href={`${basePath}/registrations`}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentRegsLoading ? (
            <div className="p-5">
              <InlineLoading message="Loading..." />
            </div>
          ) : transformedRecentRegs.length > 0 ? (
            <div className="divide-y divide-zinc-50">
              {transformedRecentRegs.map((reg: any) => {
                const first = reg.athlete?.first_name || ''
                const last = reg.athlete?.last_name || ''
                const initials = `${first[0] || ''}${last[0] || ''}`.toUpperCase() || '?'
                return (
                  <div
                    key={reg.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50/60 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-semibold text-zinc-500">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {first} {last}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">{reg.program?.name}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset capitalize ${statusStyle(reg.status)}`}>
                      {reg.status}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-zinc-400">No registrations yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
