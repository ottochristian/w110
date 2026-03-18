'use client'

import { useState, useMemo } from 'react'
import { useRequireAdmin } from '@/lib/auth-context'
import { useSelectedSeason } from '@/lib/contexts/season-context'
import { useRegistrationSummary, useRegistrationsByProgram, useRevenueTimeseries } from '@/lib/hooks/use-registrations'
import { AnalyticsFilterBar } from '@/components/admin/analytics/filter-bar'
import { HeroMetrics } from '@/components/admin/analytics/hero-metrics'
import { AdminPageHeader } from '@/components/admin-page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InlineLoading } from '@/components/ui/loading-states'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CHART_PALETTE, CHART_COLORS, GRID_PROPS, AXIS_STYLE, TOOLTIP_STYLE, LEGEND_STYLE, GRADIENT_IDS } from '@/lib/chart-theme'
import { colors } from '@/lib/colors'

export default function AnalyticsOverviewPage() {
  const { profile, loading: authLoading } = useRequireAdmin()
  const selectedSeason = useSelectedSeason()
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('7')

  // Fetch current season data
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useRegistrationSummary(selectedSeason?.id, profile?.club_id || undefined)

  const {
    data: programData,
    isLoading: programLoading,
  } = useRegistrationsByProgram(selectedSeason?.id, profile?.club_id || undefined)

  // Fetch revenue timeseries
  const {
    data: revenueTimeseriesData,
    isLoading: revenueTimeseriesLoading,
  } = useRevenueTimeseries(selectedSeason?.id, profile?.club_id || undefined)

  // Transform data for hero metrics
  const heroData = useMemo(() => {
    if (!summary) return undefined

    return {
      totalRevenue: summary.payments.paidAmount,
      netRevenue: summary.netRevenue,
      activeRegistrations: summary.totals.registrations,
      confirmedCount: summary.status.confirmed,
      pendingCount: summary.status.pending,
      waitlistedCount: summary.status.waitlisted,
      activeAthletes: summary.totals.athletes,
      activeHouseholds: summary.totals.households,
      outstandingPayments: summary.payments.unpaidCount,
      outstandingAmount: summary.payments.unpaidAmount,
    }
  }, [summary])


  // Transform program data for charts
  const programChartData = useMemo(() => {
    if (!programData?.bySport) return []

    return programData.bySport
      .sort((a, b) => b.registrations - a.registrations)
      .slice(0, 8) // Top 8 programs
  }, [programData])

  // Status breakdown for pie chart
  const statusChartData = useMemo(() => {
    if (!summary) return []

    return [
      {
        name: 'Confirmed',
        value: summary.status.confirmed,
        color: colors.chart[2], // emerald
      },
      {
        name: 'Pending',
        value: summary.status.pending,
        color: colors.chart[4], // amber
      },
      {
        name: 'Waitlisted',
        value: summary.status.waitlisted,
        color: colors.chart[7], // red
      },
    ].filter((item) => item.value > 0)
  }, [summary])

  // Filter revenue timeseries by date range
  const revenueChartData = useMemo(() => {
    if (!revenueTimeseriesData?.timeseries) return []

    const now = new Date()
    const cutoffDate = new Date()
    
    if (dateRange === '7') {
      cutoffDate.setDate(now.getDate() - 7)
    } else if (dateRange === '30') {
      cutoffDate.setDate(now.getDate() - 30)
    } else if (dateRange === '90') {
      cutoffDate.setDate(now.getDate() - 90)
    } else {
      return revenueTimeseriesData.timeseries
    }

    return revenueTimeseriesData.timeseries
      .filter((point) => new Date(point.date) >= cutoffDate)
      .map((point) => ({
        ...point,
        displayDate: new Date(point.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      }))
  }, [revenueTimeseriesData, dateRange])

  if (authLoading || !profile) {
    return <InlineLoading message="Loading dashboard..." />
  }

  const isLoading = summaryLoading || programLoading

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Analytics Overview"
        description="High-level insights for executive decision-making"
      />

      {/* Filter Bar - Hidden for Overview (season selector is in header) */}

      {/* Hero Metrics */}
      <HeroMetrics data={heroData} loading={isLoading} />

      {/* Revenue Over Time - Full Width */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revenue Over Time</CardTitle>
              <CardDescription>
                Daily revenue trend for the selected period
              </CardDescription>
            </div>
            <Select value={dateRange} onValueChange={(val: any) => setDateRange(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {revenueTimeseriesLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <InlineLoading message="Loading revenue data..." />
            </div>
          ) : revenueChartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No revenue data for selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id={GRADIENT_IDS.emerald} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.chart[2]} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colors.chart[2]} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis
                  dataKey="displayDate"
                  {...AXIS_STYLE}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                  {...AXIS_STYLE}
                />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="paidAmount"
                  stroke={CHART_COLORS.success}
                  strokeWidth={2}
                  fill={`url(#${GRADIENT_IDS.emerald})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Registrations by Program */}
        <Card>
          <CardHeader>
            <CardTitle>Registrations by Program</CardTitle>
            <CardDescription>
              Top programs by enrollment (showing top 8)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <InlineLoading message="Loading chart..." />
              </div>
            ) : programChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No program data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={programChartData} layout="vertical">
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis
                    type="category"
                    dataKey="programName"
                    width={120}
                    {...AXIS_STYLE}
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(value: number) => [`${value} athletes`, 'Registrations']}
                  />
                  <Bar dataKey="registrations" radius={[0, 4, 4, 0]}>
                    {programChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Registration Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Status</CardTitle>
            <CardDescription>
              Distribution of registration statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <InlineLoading message="Loading chart..." />
              </div>
            ) : statusChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No status data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill={CHART_COLORS.primary}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(value: number) => [`${value} athletes`, 'Count']}
                  />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Program */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Program</CardTitle>
            <CardDescription>
              Total revenue collected per program
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <InlineLoading message="Loading chart..." />
              </div>
            ) : programChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No revenue data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={programChartData} layout="vertical">
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) =>
                      `$${(value / 1000).toFixed(0)}k`
                    }
                    {...AXIS_STYLE}
                  />
                  <YAxis
                    type="category"
                    dataKey="programName"
                    width={120}
                    {...AXIS_STYLE}
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(value: number) => [
                      `$${value.toLocaleString()}`,
                      'Revenue',
                    ]}
                  />
                  <Bar dataKey="paidAmount" radius={[0, 4, 4, 0]}>
                    {programChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Program Capacity Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Program Performance</CardTitle>
            <CardDescription>
              Summary metrics across all programs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <InlineLoading message="Loading metrics..." />
              </div>
            ) : !programData?.bySport || programData.bySport.length === 0 ? (
              <div className="text-muted-foreground">
                No program data available
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-sm font-medium">Total Programs</span>
                  <span className="metric-value">
                    {programData.bySport.length}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-sm font-medium">Avg per Program</span>
                  <span className="metric-value">
                    {Math.round(
                      programData.bySport.reduce(
                        (sum, p) => sum + p.registrations,
                        0
                      ) / programData.bySport.length
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-sm font-medium">Most Popular</span>
                  <span className="text-sm font-medium text-right">
                    {programData.bySport.sort(
                      (a, b) => b.registrations - a.registrations
                    )[0]?.programName || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Revenue</span>
                  <span className="metric-value text-green-600">
                    $
                    {programData.bySport
                      .reduce((sum, p) => sum + p.paidAmount, 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions / Insights */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
            <CardDescription>
              Actionable items that need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.status.pending > 0 && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-amber-600 font-semibold">⚠️</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">
                      {summary.status.pending} pending registration{summary.status.pending > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Review and approve pending registrations
                    </p>
                  </div>
                </div>
              )}

              {summary.status.waitlisted > 0 && (
                <div className="flex items-start gap-3 p-3 bg-blue-950/30 border border-blue-800/40 rounded-lg">
                  <div className="text-blue-400 font-semibold">ℹ️</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-300">
                      {summary.status.waitlisted} athlete{summary.status.waitlisted > 1 ? 's' : ''} on waitlist
                    </p>
                    <p className="text-xs text-blue-400/70 mt-0.5">
                      Consider expanding capacity or notifying when spots open
                    </p>
                  </div>
                </div>
              )}

              {summary.payments.unpaidAmount > 1000 && (
                <div className="flex items-start gap-3 p-3 bg-red-950/30 border border-red-800/40 rounded-lg">
                  <div className="text-red-400 font-semibold">💰</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-300">
                      ${summary.payments.unpaidAmount.toLocaleString()} outstanding
                    </p>
                    <p className="text-xs text-red-400/70 mt-0.5">
                      {summary.payments.unpaidCount} household{summary.payments.unpaidCount > 1 ? 's' : ''} need{summary.payments.unpaidCount === 1 ? 's' : ''} payment follow-up
                    </p>
                  </div>
                </div>
              )}

              {summary.status.pending === 0 &&
                summary.status.waitlisted === 0 &&
                summary.payments.unpaidAmount < 1000 && (
                  <div className="flex items-start gap-3 p-3 bg-green-950/30 border border-green-800/40 rounded-lg">
                    <div className="text-green-400 font-semibold">✓</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-300">
                        All systems running smoothly
                      </p>
                      <p className="text-xs text-green-400/70 mt-0.5">
                        No urgent actions required at this time
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
