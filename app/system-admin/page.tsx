'use client'

import { useEffect, useState, type ElementType } from 'react'
import { useSystemAdmin } from '@/lib/use-system-admin'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Users,
  UserCheck,
  DollarSign,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Percent,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'

interface OverviewStats {
  clubs: {
    total: number
    withAdmins: number
    withActivePrograms: number
    inactive: number
  }
  users: {
    total: number
    admins: number
    coaches: number
    parents: number
    activeToday: number
  }
  athletes: {
    total: number
    male: number
    female: number
    other: number
  }
  programs: {
    total: number
    active: number
    draft: number
    archived: number
    bySport: { [key: string]: number }
  }
  registrations: {
    total: number
    last30Days: number
  }
  revenue: {
    last30Days: number
    formatted: string
    paidCount: number
  }
  payments: {
    paid: number
    pending: number
    failed: number
    successRate: number
  }
  systemHealth: {
    errors24h: number
    webhooksProcessed24h: number
    webhookSuccessRate: number
  }
}

function MetricCell({
  label,
  value,
  sub,
  icon: Icon,
  valueColor,
}: {
  label: string
  value: string | number
  sub?: string
  icon: ElementType
  valueColor?: string
}) {
  return (
    <div className="bg-zinc-900 px-5 py-5">
      <div className="flex items-start justify-between mb-4">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">{label}</span>
        <Icon className="h-3.5 w-3.5 text-zinc-600 mt-0.5" />
      </div>
      <p className={`metric-value ${valueColor || 'text-foreground'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-400 mt-2">{sub}</p>}
    </div>
  )
}

export default function SystemAdminDashboard() {
  const { profile, loading: authLoading } = useSystemAdmin()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    setRefreshing(true)
    setError(null)

    try {
      const response = await fetch('/api/system-admin/overview', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Failed to fetch: ${response.status} - ${errorData.error || 'Unknown'}`)
      }

      const data = await response.json()
      if (!data.stats) throw new Error('Invalid response format: missing stats')
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    loadStats()
  }, [authLoading])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3 text-zinc-400" />
          <p className="text-sm text-zinc-400">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <p className="page-title text-foreground">System Overview</p>
        </div>
        <div className="rounded-xl border border-red-900/50 bg-red-900/20 px-5 py-4">
          <div className="flex items-center gap-2 text-red-400 mb-3">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm font-medium">Failed to load dashboard</p>
          </div>
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <Button onClick={loadStats} variant="outline" size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const healthOk = stats.systemHealth.errors24h === 0

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title text-foreground">System Overview</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Platform-wide metrics and health</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/system-admin/monitoring">
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              Monitoring
            </Link>
          </Button>
          <Button
            onClick={loadStats}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Primary Metric Strip — Clubs · Users · Athletes · Revenue */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800 rounded-xl overflow-hidden ring-1 ring-zinc-800">
        <MetricCell
          label="Clubs"
          value={stats.clubs.total}
          sub={`${stats.clubs.withAdmins} with admins · ${stats.clubs.inactive} inactive`}
          icon={Building2}
        />
        <MetricCell
          label="Users"
          value={stats.users.total}
          sub={`${stats.users.activeToday} active today`}
          icon={Users}
        />
        <MetricCell
          label="Athletes"
          value={stats.athletes.total.toLocaleString()}
          sub={`${stats.athletes.male.toLocaleString()} M · ${stats.athletes.female.toLocaleString()} F`}
          icon={Users}
        />
        <MetricCell
          label="Revenue (30d)"
          value={stats.revenue.formatted}
          sub={`${stats.revenue.paidCount} paid registrations`}
          icon={DollarSign}
        />
      </div>

      {/* Secondary Metric Strip — Programs · Registrations · Payments · Health */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800 rounded-xl overflow-hidden ring-1 ring-zinc-800">
        <MetricCell
          label="Programs"
          value={stats.programs.total}
          sub={`${stats.programs.active} active · ${stats.programs.draft} draft`}
          icon={FileText}
        />
        <MetricCell
          label="Registrations"
          value={stats.registrations.total.toLocaleString()}
          sub={`${stats.registrations.last30Days} in last 30 days`}
          icon={CheckCircle}
        />
        <MetricCell
          label="Payment rate"
          value={`${stats.payments.successRate}%`}
          sub={`${stats.payments.failed} failed · ${stats.payments.pending} pending`}
          icon={Percent}
        />
        <MetricCell
          label="System health"
          value={healthOk ? 'OK' : stats.systemHealth.errors24h}
          sub={healthOk ? 'No errors in 24h' : `errors in last 24h`}
          icon={Activity}
          valueColor={healthOk ? 'text-emerald-600' : 'text-red-600'}
        />
      </div>

      {/* Second Row — User Breakdown + Payments + Programs */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* User Breakdown */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-foreground">Users by Role</h3>
          </div>
          <div className="grid grid-cols-2 gap-px bg-zinc-800 p-px">
            {[
              { label: 'Admins', value: stats.users.admins },
              { label: 'Coaches', value: stats.users.coaches },
              { label: 'Parents', value: stats.users.parents },
              { label: 'Active Today', value: stats.users.activeToday, highlight: true },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="bg-zinc-900 px-4 py-4">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">{label}</p>
                <p className={`metric-value ${highlight ? 'text-emerald-400' : 'text-foreground'}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Status */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-foreground">Payment Status</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Last 30 days</p>
          </div>
          <div className="divide-y divide-zinc-800">
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm text-zinc-300">Paid</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground tabular-nums">{stats.payments.paid}</span>
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-emerald-900/30 text-emerald-400 ring-1 ring-inset ring-emerald-800">
                  {stats.payments.successRate}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-sm text-zinc-300">Pending</span>
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums">{stats.payments.pending}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-sm text-zinc-300">Failed</span>
              </div>
              <span className="text-sm font-semibold text-red-400 tabular-nums">{stats.payments.failed}</span>
            </div>
          </div>
        </div>

        {/* Programs by Sport */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-foreground">Programs by Sport</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Distribution across sports</p>
          </div>
          {Object.keys(stats.programs.bySport).length > 0 ? (
            <div className="divide-y divide-zinc-800">
              {Object.entries(stats.programs.bySport)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([sport, count]) => (
                  <div key={sport} className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-sm text-zinc-300 capitalize">{sport}</span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">{count}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="px-5 py-8 text-sm text-zinc-400">No programs yet</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800 p-px">
          {[
            { href: '/system-admin/clubs', icon: Building2, label: 'Manage Clubs' },
            { href: '/system-admin/monitoring', icon: Activity, label: 'Monitoring' },
            { href: '/system-admin/clubs/new', icon: Building2, label: 'Create Club' },
            { href: '/system-admin/admins', icon: UserCheck, label: 'View Admins' },
          ].map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="bg-zinc-900 flex items-center gap-3 px-5 py-4 hover:bg-zinc-800 transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-700 transition-colors">
                <Icon className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <span className="text-sm font-medium text-zinc-300">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
