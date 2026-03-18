'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { Users, TrendingUp, Home, UserPlus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyticsFilterBar } from '@/components/admin/analytics/filter-bar'
import { useClub } from '@/lib/club-context'
import {
  useAthleteSummary,
  useAthletesByProgram,
  useAthletesByGender,
  useAthletesByAge,
} from '@/lib/hooks/use-athletes'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { CHART_PALETTE, CHART_COLORS, GRID_PROPS, AXIS_STYLE, TOOLTIP_STYLE } from '@/lib/chart-theme'

export default function AthletesPage() {
  const searchParams = useSearchParams()
  const { club } = useClub()

  // Get filters from URL
  const programId = searchParams.get('programId') || 'all'
  const gender = searchParams.get('gender') || 'all'

  const filters = {
    programId,
    gender,
  }

  // Fetch data
  const { data: summary, isLoading: summaryLoading } = useAthleteSummary(club?.id || null, filters)
  const { data: byProgram, isLoading: byProgramLoading } = useAthletesByProgram(club?.id || null, filters)
  const { data: byGender, isLoading: byGenderLoading } = useAthletesByGender(club?.id || null, filters)
  const { data: byAge, isLoading: byAgeLoading } = useAthletesByAge(club?.id || null, filters)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Athletes</h1>
        <p className="text-muted-foreground mt-2">
          Athlete enrollment and demographic analytics
        </p>
      </div>

      {/* Filters */}
      <AnalyticsFilterBar
        clubId={club?.id || ''}
        showAdvancedFilters="always"
        showSeasonDisplay={false}
        showDateRange={false}
        showGender={true}
      />

      {/* Hero Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Athletes
            </CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="metric-value text-orange-600">
                  {summary?.totalAthletes || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enrolled this season
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              New Athletes
            </CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-32 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="metric-value text-green-600">
                  {summary?.newAthletes || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  First time this season
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Returning Athletes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="metric-value text-purple-600">
                  {summary?.returningAthletes || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  From previous season
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Households
            </CardTitle>
            <Home className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="metric-value text-amber-600">
                  {summary?.uniqueHouseholds || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Unique families
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Athletes by Program */}
        <Card>
          <CardHeader>
            <CardTitle>Athletes by Program</CardTitle>
            <CardDescription>
              Total enrollment per program
            </CardDescription>
          </CardHeader>
          <CardContent>
            {byProgramLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading...</div>
              </div>
            ) : !byProgram?.programs || byProgram.programs.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-sm text-muted-foreground">No data available</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byProgram.programs}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="programName" angle={-45} textAnchor="end" height={100} {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="athleteCount" fill={CHART_COLORS.primary} name="Athletes" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
            <CardDescription>
              Athlete breakdown by gender
            </CardDescription>
          </CardHeader>
          <CardContent>
            {byGenderLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading...</div>
              </div>
            ) : !byGender?.distribution || byGender.distribution.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-sm text-muted-foreground">No data available</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byGender.distribution}
                    dataKey="count"
                    nameKey="gender"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {byGender.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Age Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Age Group Distribution</CardTitle>
          <CardDescription>
            Athletes by age group
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byAgeLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : !byAge?.distribution || byAge.distribution.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-sm text-muted-foreground">No data available</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byAge.distribution}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="ageGroup" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" fill={CHART_COLORS.primary} name="Athletes" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
