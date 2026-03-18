'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, Users, DollarSign, Award, Target } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useClub } from '@/lib/club-context'
import { useSelectedSeason } from '@/lib/contexts/season-context'
import { useProgramsAnalytics } from '@/lib/hooks/use-program-analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { CHART_PALETTE, CHART_COLORS, GRID_PROPS, AXIS_STYLE, TOOLTIP_STYLE, LEGEND_STYLE } from '@/lib/chart-theme'

type SortOption = 'name' | 'enrollment' | 'revenue' | 'enrollmentRate'

export default function ProgramsPage() {
  const { club } = useClub()
  const selectedSeason = useSelectedSeason()
  const [sortBy, setSortBy] = useState<SortOption>('name')

  // Fetch data
  const { data, isLoading, error } = useProgramsAnalytics(
    club?.id || null,
    selectedSeason?.id || null
  )

  const summary = data?.summary
  const programs = data?.programs || []

  // Sort programs
  const sortedPrograms = useMemo(() => {
    const sorted = [...programs]
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case 'enrollment':
        return sorted.sort((a, b) => b.currentEnrollment - a.currentEnrollment)
      case 'revenue':
        return sorted.sort((a, b) => b.revenue - a.revenue)
      case 'enrollmentRate':
        return sorted.sort((a, b) => {
          const rateA = a.enrollmentRate ?? -1
          const rateB = b.enrollmentRate ?? -1
          return rateB - rateA
        })
      default:
        return sorted
    }
  }, [programs, sortBy])

  // Prepare chart data
  const enrollmentChartData = useMemo(() => {
    return sortedPrograms.map(p => ({
      name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
      enrolled: p.currentEnrollment,
      remaining: p.maxCapacity ? Math.max(0, p.maxCapacity - p.currentEnrollment) : 0,
    }))
  }, [sortedPrograms])

  const revenueChartData = useMemo(() => {
    return sortedPrograms
      .filter(p => p.revenue > 0)
      .map(p => ({
        name: p.name.length > 25 ? p.name.substring(0, 25) + '...' : p.name,
        value: p.revenue,
      }))
  }, [sortedPrograms])

  // Helper to get enrollment rate color
  const getEnrollmentColor = (rate: number | null) => {
    if (rate === null) return 'text-gray-600'
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getEnrollmentBgColor = (rate: number | null) => {
    if (rate === null) return 'bg-gray-100'
    if (rate >= 80) return 'bg-green-600'
    if (rate >= 60) return 'bg-yellow-600'
    return 'bg-red-600'
  }

  // Helper to export CSV
  const exportToCSV = () => {
    const headers = ['Program', 'Enrollment', 'Capacity', 'Rate %', 'Revenue', 'Paid', 'Unpaid', 'Price', 'Avg Revenue/Athlete']
    const rows = sortedPrograms.map(p => [
      p.name,
      p.currentEnrollment,
      p.maxCapacity || 'Unlimited',
      p.enrollmentRate !== null ? `${p.enrollmentRate}%` : 'N/A',
      `$${p.revenue.toFixed(2)}`,
      p.paidCount,
      p.unpaidCount,
      `$${p.pricePerPerson.toFixed(2)}`,
      `$${p.avgRevenuePerAthlete.toFixed(2)}`,
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `programs-analytics-${selectedSeason?.name || 'export'}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Programs</h1>
          <p className="text-muted-foreground mt-2">
            Program performance, enrollment, and revenue analytics
          </p>
        </div>
        <Button onClick={exportToCSV} disabled={isLoading || programs.length === 0}>
          Export CSV
        </Button>
      </div>

      {/* Hero Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Programs
            </CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="metric-value text-blue-600">
                  {summary?.totalPrograms || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active this season
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Enrollment Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-32 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="metric-value text-purple-600">
                  {summary?.avgEnrollmentRate !== null ? `${summary?.avgEnrollmentRate}%` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Capacity utilization
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Most Popular
            </CardTitle>
            <Award className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-24 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="metric-value-sm text-yellow-600">
                  {summary?.mostPopularProgram?.enrollment || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {summary?.mostPopularProgram?.name || 'N/A'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-24 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="metric-value text-green-600">
                  ${(summary?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All programs combined
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Revenue/Program
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-24 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="metric-value text-indigo-600">
                  ${(summary?.avgRevenuePerProgram || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Per program average
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Enrollment vs Capacity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollment vs Capacity</CardTitle>
            <CardDescription>
              Current enrollment and remaining capacity by program
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-muted-foreground">Loading chart...</div>
              </div>
            ) : enrollmentChartData.length === 0 ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-muted-foreground">No program data available</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={enrollmentChartData}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    {...AXIS_STYLE}
                  />
                  <YAxis {...AXIS_STYLE} label={{ value: 'Athletes', angle: -90, position: 'insideLeft', fill: CHART_COLORS.axis }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                  <Bar dataKey="enrolled" stackId="a" fill={CHART_COLORS.primary} name="Enrolled" />
                  <Bar dataKey="remaining" stackId="a" fill={CHART_COLORS.grid} name="Remaining Capacity" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Distribution</CardTitle>
            <CardDescription>
              Revenue breakdown by program
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-muted-foreground">Loading chart...</div>
              </div>
            ) : revenueChartData.length === 0 ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-muted-foreground">No revenue data available</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={revenueChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `$${(entry.value / 1000).toFixed(1)}k`}
                    outerRadius={100}
                    fill={CHART_PALETTE[0]}
                    dataKey="value"
                  >
                    {revenueChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Program Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Program Performance</CardTitle>
              <CardDescription>
                Detailed metrics for each program
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-sm border rounded-md px-3 py-1.5 bg-background"
              >
                <option value="name">Sort by Name</option>
                <option value="enrollment">Sort by Enrollment</option>
                <option value="revenue">Sort by Revenue</option>
                <option value="enrollmentRate">Sort by Enrollment Rate</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="flex justify-between">
                      <div className="h-6 w-40 rounded bg-secondary" />
                      <div className="h-6 w-24 rounded bg-secondary" />
                    </div>
                    <div className="h-4 w-full rounded bg-secondary" />
                    <div className="grid grid-cols-4 gap-4">
                      <div className="h-12 rounded bg-secondary" />
                      <div className="h-12 rounded bg-secondary" />
                      <div className="h-12 rounded bg-secondary" />
                      <div className="h-12 rounded bg-secondary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : sortedPrograms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No programs found for this season
            </div>
          ) : (
            <div className="space-y-4">
              {sortedPrograms.map((program) => {
                const enrollmentRate = program.enrollmentRate
                const isFull = enrollmentRate !== null && enrollmentRate >= 100
                const isLowEnrollment = enrollmentRate !== null && enrollmentRate < 60

                return (
                  <div
                    key={program.id}
                    className="border rounded-lg p-5 space-y-4 hover:border-primary/50 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="card-title">{program.name}</h3>
                          {isFull && (
                            <Badge variant="destructive">Full</Badge>
                          )}
                          {isLowEnrollment && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Low Enrollment
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          ${program.pricePerPerson.toFixed(2)} per athlete
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="metric-value text-green-600">
                          ${program.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Revenue</div>
                      </div>
                    </div>

                    {/* Enrollment Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">
                          Enrollment: {program.currentEnrollment} / {program.maxCapacity || '∞'}
                        </span>
                        {enrollmentRate !== null && (
                          <span className={`font-semibold ${getEnrollmentColor(enrollmentRate)}`}>
                            {enrollmentRate}%
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${getEnrollmentBgColor(enrollmentRate)}`}
                          style={{ width: `${Math.min(enrollmentRate || 0, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-4 gap-4 pt-2 border-t">
                      <div>
                        <div className="text-xs text-muted-foreground">Paid</div>
                        <div className="metric-value-sm text-green-600">
                          {program.paidCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Unpaid</div>
                        <div className="metric-value-sm text-red-600">
                          {program.unpaidCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Total Enrolled</div>
                        <div className="metric-value-sm">
                          {program.currentEnrollment}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Avg Rev/Athlete</div>
                        <div className="metric-value-sm">
                          ${program.avgRevenuePerAthlete.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
