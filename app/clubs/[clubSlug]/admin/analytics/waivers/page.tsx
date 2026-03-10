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

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

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
    if (rate >= 90) return 'bg-green-50'
    if (rate >= 70) return 'bg-yellow-50'
    return 'bg-red-50'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Waivers</h1>
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
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">
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
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold ${getComplianceColor(summary?.complianceRate || 0)}`}>
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
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
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
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-purple-600">
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
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="programName"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  label={{ value: 'Compliance %', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
                />
                <Tooltip />
                <Bar dataKey="complianceRate" fill="#3b82f6" />
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
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
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
                    <div className="w-full bg-gray-200 rounded-full h-2">
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
                  <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : !missingWaivers || missingWaivers.length === 0 ? (
              <div className="text-center py-8 text-green-600 font-medium">
                ✓ All athletes are compliant!
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {missingWaivers.map((athlete) => (
                  <div
                    key={athlete.athleteId}
                    className="border rounded-lg p-4 space-y-2 bg-red-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{athlete.athleteName}</div>
                        <div className="text-sm text-muted-foreground">
                          {athlete.programName}
                        </div>
                      </div>
                      <Badge variant="destructive">
                        {athlete.missingWaivers.length} missing
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="font-medium text-muted-foreground">
                        Missing waivers:
                      </div>
                      <ul className="list-disc list-inside space-y-1">
                        {athlete.missingWaivers.map((waiver) => (
                          <li key={waiver.id} className="text-sm">
                            {waiver.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-sm pt-2 border-t">
                      <div className="text-muted-foreground">Guardian:</div>
                      <div>{athlete.guardianName}</div>
                      {athlete.guardianEmail && (
                        <div className="text-blue-600 hover:underline">
                          <a href={`mailto:${athlete.guardianEmail}`}>
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
