'use client'

import { useSearchParams } from 'next/navigation'
import { FileCheck, CheckCircle2, XCircle, FileSignature, Activity, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyticsFilterBar } from '@/components/admin/analytics/filter-bar'
import { useClub } from '@/lib/club-context'
import { useSelectedSeason } from '@/lib/contexts/season-context'
import { Badge } from '@/components/ui/badge'
import {
  useWaiverSummary,
  useWaiverComplianceByProgram,
  useWaiverDetails,
  useAthletesMissingWaivers,
} from '@/lib/hooks/use-waiver-analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_COLORS, GRID_PROPS, AXIS_STYLE, TOOLTIP_STYLE } from '@/lib/chart-theme'

export default function WaiversPage() {
  const searchParams = useSearchParams()
  const { club } = useClub()
  const selectedSeason = useSelectedSeason()

  // Get filters from URL
  const programId = searchParams.get('programId') || 'all'

  const filters = {
    programId,
  }

  // Fetch data
  const { data: summary, isLoading: summaryLoading } = useWaiverSummary(
    club?.id || null,
    selectedSeason?.id || null,
    filters
  )
  const { data: byProgram, isLoading: byProgramLoading } = useWaiverComplianceByProgram(
    club?.id || null,
    selectedSeason?.id || null
  )
  const { data: waiverDetails, isLoading: detailsLoading } = useWaiverDetails(
    club?.id || null,
    selectedSeason?.id || null
  )
  const { data: missingWaivers, isLoading: missingLoading } = useAthletesMissingWaivers(
    club?.id || null,
    selectedSeason?.id || null,
    filters
  )

  // Helper function to get compliance color
  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600'
    if (rate >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getComplianceBgColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-950/30'
    if (rate >= 70) return 'bg-yellow-950/30'
    return 'bg-red-950/30'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Waivers</h1>
        <p className="text-muted-foreground mt-2">
          Waiver compliance and signature tracking
        </p>
      </div>

      {/* Filters */}
      <AnalyticsFilterBar
        clubId={club?.id || ''}
        showAdvancedFilters="always"
        showSeasonDisplay={false}
        showDateRange={false}
        showGender={false}
      />

      {/* Hero Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Required Waivers
            </CardTitle>
            <FileCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="metric-value text-blue-600">
                  {summary?.totalRequired || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active this season
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={summaryLoading ? '' : getComplianceBgColor(summary?.complianceRate || 0)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Compliance Rate
            </CardTitle>
            <CheckCircle2 className={`h-4 w-4 ${summaryLoading ? 'text-gray-400' : getComplianceColor(summary?.complianceRate || 0)}`} />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-32 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className={`metric-value ${getComplianceColor(summary?.complianceRate || 0)}`}>
                  {summary?.complianceRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Athletes fully compliant
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Missing Waivers
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="metric-value text-red-600">
                  {summary?.athletesMissing || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Athletes not compliant
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Signatures
            </CardTitle>
            <FileSignature className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-32 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="metric-value text-purple-600">
                  {summary?.totalSignatures || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Collected this season
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="metric-value text-green-600">
                  {summary?.recentSignatures || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 7 days
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance by Program Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance by Program</CardTitle>
          <CardDescription>
            Waiver completion rates across programs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byProgramLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="text-muted-foreground">Loading chart...</div>
            </div>
          ) : !byProgram || byProgram.length === 0 ? (
            <div className="h-80 flex items-center justify-center">
              <div className="text-muted-foreground">No program data available</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={byProgram}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis
                  {...AXIS_STYLE}
                  dataKey="programName"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  {...AXIS_STYLE}
                  label={{ value: 'Compliance %', angle: -90, position: 'insideLeft', fill: CHART_COLORS.axis }}
                  domain={[0, 100]}
                />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="complianceRate" fill={CHART_COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Waiver Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Waiver Details</CardTitle>
            <CardDescription>
              Signature status for each waiver
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detailsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-secondary rounded animate-pulse" />
                ))}
              </div>
            ) : !waiverDetails || waiverDetails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No waivers found for this season
              </div>
            ) : (
              <div className="space-y-4">
                {waiverDetails.map((waiver) => (
                  <div
                    key={waiver.waiverId}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{waiver.title}</div>
                      {waiver.required && (
                        <Badge variant="destructive">Required</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {waiver.signedCount} / {waiver.totalAthletes} signed
                      </span>
                      <span className={`font-semibold ${getComplianceColor(waiver.signedPercentage)}`}>
                        {waiver.signedPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          waiver.signedPercentage >= 90
                            ? 'bg-green-600'
                            : waiver.signedPercentage >= 70
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${waiver.signedPercentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Athletes Missing Waivers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Athletes Missing Waivers
            </CardTitle>
            <CardDescription>
              Athletes who haven't signed all required waivers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {missingLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-secondary rounded animate-pulse" />
                ))}
              </div>
            ) : !missingWaivers || missingWaivers.length === 0 ? (
              <div className="text-center py-8 text-green-600 font-medium">
                ✓ All athletes are compliant!
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {missingWaivers.map((athlete) => (
                  <div
                    key={athlete.athleteId}
                    className="border border-border rounded-lg p-4 space-y-2 bg-card border-l-2 border-l-red-500"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-foreground">{athlete.athleteName}</div>
                        <div className="text-sm text-muted-foreground">
                          {athlete.programName}
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-md border border-red-800 bg-red-950/40 px-2 py-0.5 text-xs font-medium text-red-400">
                        {athlete.missingWaivers.length} missing
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Missing waivers</div>
                      <ul className="space-y-0.5">
                        {athlete.missingWaivers.map((waiver) => (
                          <li key={waiver.id} className="flex items-center gap-1.5 text-sm text-foreground">
                            <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                            {waiver.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-sm pt-2 border-t border-border">
                      <span className="text-muted-foreground">Guardian: </span>
                      <span>{athlete.guardianName}</span>
                      {athlete.guardianEmail && (
                        <div>
                          <a
                            href={`mailto:${athlete.guardianEmail}`}
                            className="text-orange-500 hover:text-orange-400"
                          >
                            {athlete.guardianEmail}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
