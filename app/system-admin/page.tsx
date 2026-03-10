'use client'

import { useEffect, useState } from 'react'
import { useSystemAdmin } from '@/lib/use-system-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Users, 
  UserCheck, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Percent,
  RefreshCw
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
      const response = await fetch('/api/system-admin/overview')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }

      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      console.error('Error loading stats:', err)
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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">System Overview</h2>
            <p className="text-muted-foreground">System-wide metrics and statistics</p>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <p>Failed to load dashboard: {error}</p>
            </div>
            <Button onClick={loadStats} variant="outline" size="sm" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Overview</h2>
          <p className="text-muted-foreground">System-wide metrics and statistics</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/system-admin/monitoring">
            <Button variant="outline" size="sm">
              <Activity className="w-4 h-4 mr-2" />
              View Monitoring
            </Button>
          </Link>
          <Button 
            onClick={loadStats} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Top Row: Clubs & Users */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clubs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clubs.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.clubs.withAdmins} with admins • {stats.clubs.inactive} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.users.activeToday} active today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Athletes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.athletes.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.athletes.male}M • {stats.athletes.female}F
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (30d)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.revenue.formatted}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.revenue.paidCount} paid registrations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Programs & Registrations */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.programs.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.programs.active} active • {stats.programs.draft} draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registrations</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.registrations.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.registrations.last30Days} in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Success</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.payments.successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.payments.failed} failed in 30d
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.systemHealth.errors24h === 0 ? '✓' : stats.systemHealth.errors24h}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.systemHealth.errors24h === 0 ? 'No errors today' : `${stats.systemHealth.errors24h} errors (24h)`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>User Breakdown</CardTitle>
          <CardDescription>Distribution of users by role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold">{stats.users.admins}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Coaches</p>
              <p className="text-2xl font-bold">{stats.users.coaches}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Parents</p>
              <p className="text-2xl font-bold">{stats.users.parents}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Today</p>
              <p className="text-2xl font-bold text-green-600">{stats.users.activeToday}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Status & Programs */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Status (Last 30 Days)</CardTitle>
            <CardDescription>Payment success and failure rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{stats.payments.paid}</span>
                  <Badge className="bg-green-600">{stats.payments.successRate}%</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm">Pending</span>
                </div>
                <span className="text-xl font-bold">{stats.payments.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm">Failed</span>
                </div>
                <span className="text-xl font-bold text-red-600">{stats.payments.failed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Programs by Sport</CardTitle>
            <CardDescription>Distribution across sports</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.programs.bySport).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(stats.programs.bySport)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([sport, count]) => (
                    <div key={sport} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{sport}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No programs yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common system administration tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/system-admin/clubs">
              <Button variant="outline" className="w-full">
                <Building2 className="w-4 h-4 mr-2" />
                Manage Clubs
              </Button>
            </Link>
            <Link href="/system-admin/monitoring">
              <Button variant="outline" className="w-full">
                <Activity className="w-4 h-4 mr-2" />
                View Monitoring
              </Button>
            </Link>
            <Link href="/system-admin/clubs/new">
              <Button variant="outline" className="w-full">
                <Building2 className="w-4 h-4 mr-2" />
                Create Club
              </Button>
            </Link>
            <Link href="/system-admin/admins">
              <Button variant="outline" className="w-full">
                <UserCheck className="w-4 h-4 mr-2" />
                View Admins
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
