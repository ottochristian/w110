'use client'

import { useMemo } from 'react'
import { useRequireAdmin } from '@/lib/auth-context'
import { useSelectedSeason } from '@/lib/contexts/season-context'
import { useSearchParams } from 'next/navigation'
import {
  useRevenueSummary,
  useRevenueByProgram,
  usePaymentMethods,
  useCumulativeRevenue,
  useOutstandingPayments,
} from '@/lib/hooks/use-revenue'
import { AnalyticsFilterBar } from '@/components/admin/analytics/filter-bar'
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
  AreaChart,
  Area,
} from 'recharts'
import { DollarSign, TrendingUp, AlertCircle, CreditCard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const PROGRAM_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
]

const METHOD_COLORS: Record<string, string> = {
  stripe: '#635BFF',
  cash: '#10B981',
  check: '#3B82F6',
  other: '#6B7280',
}

export default function RevenuePage() {
  const { profile, loading: authLoading } = useRequireAdmin()
  const selectedSeason = useSelectedSeason()
  const searchParams = useSearchParams()

  // Read filters from URL
  const filters = useMemo(() => ({
    dateRange: searchParams.get('dateRange') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    programId: searchParams.get('programId') || undefined,
    status: searchParams.get('status') || undefined,
    payment: searchParams.get('payment') || undefined,
  }), [searchParams])

  const {
    data: summary,
    isLoading: summaryLoading,
  } = useRevenueSummary(profile?.club_id || null, filters)

  const {
    data: programRevenue,
    isLoading: programLoading,
  } = useRevenueByProgram(profile?.club_id || null, filters)

  const {
    data: paymentMethods,
    isLoading: methodsLoading,
  } = usePaymentMethods(profile?.club_id || null, filters)

  const {
    data: cumulativeData,
    isLoading: cumulativeLoading,
  } = useCumulativeRevenue(profile?.club_id || null, filters)

  const {
    data: outstandingData,
    isLoading: outstandingLoading,
  } = useOutstandingPayments(profile?.club_id || null, filters)

  const isLoading = summaryLoading || programLoading || methodsLoading || cumulativeLoading

  // Transform payment methods data
  const methodsChartData = useMemo(() => {
    if (!paymentMethods?.methods) return []
    return paymentMethods.methods.map((m) => ({
      name: m.method.charAt(0).toUpperCase() + m.method.slice(1),
      amount: m.amount,
      count: m.count,
      color: METHOD_COLORS[m.method] || METHOD_COLORS.other,
    }))
  }, [paymentMethods])

  // Transform cumulative data for chart
  const cumulativeChartData = useMemo(() => {
    if (!cumulativeData?.timeseries) return []
    return cumulativeData.timeseries.map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      amount: point.cumulativeAmount,
    }))
  }, [cumulativeData])

  // Transform program revenue data
  const programChartData = useMemo(() => {
    if (!programRevenue?.programs) return []
    return programRevenue.programs.slice(0, 8)
  }, [programRevenue])

  const handleExport = () => {
    console.log('Exporting revenue data...')
  }

  if (authLoading || !profile) {
    return <InlineLoading message="Loading dashboard..." />
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Revenue"
        description="Detailed financial analytics and outstanding payments"
      />

      {/* Filter Bar - Always Visible, No Season Display, With Date Range */}
      <AnalyticsFilterBar
        clubId={profile.club_id || ''}
        showAdvancedFilters="always"
        showSeasonDisplay={false}
        showDateRange={true}
        showGender={false}
        onFiltersChange={() => {}}
      />

      {/* Hero Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue Collected
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  ${(summary?.totalCollected || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  From {summary?.totalRegistrations || 0} registrations
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Outstanding Revenue
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-600">
                  ${(summary?.outstanding || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Unpaid or partially paid
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Refunds Issued
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  ${(summary?.refunded || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total refunded amount
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average per Registration
            </CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">
                  ${(summary?.averagePerRegistration || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Per athlete enrolled
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue by Program */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Program</CardTitle>
            <CardDescription>
              Total revenue collected per program (top 8)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {programLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <InlineLoading message="Loading chart..." />
              </div>
            ) : programChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No program revenue data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={programChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="programName"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Collected']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="paidAmount" radius={[0, 4, 4, 0]}>
                    {programChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PROGRAM_COLORS[index % PROGRAM_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Revenue breakdown by payment type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {methodsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <InlineLoading message="Loading chart..." />
              </div>
            ) : methodsChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No payment method data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={methodsChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {methodsChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cumulative Revenue Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Revenue</CardTitle>
            <CardDescription>
              Total revenue collected over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cumulativeLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <InlineLoading message="Loading chart..." />
              </div>
            ) : cumulativeChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No cumulative revenue data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cumulativeChartData}>
                  <defs>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Cumulative']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#colorCumulative)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>
              Distribution of payment statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <InlineLoading message="Loading chart..." />
              </div>
            ) : !summary ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No payment status data available
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Paid</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      ${summary.totalCollected.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((summary.totalCollected / (summary.totalCollected + summary.outstanding)) * 100 || 0).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm font-medium">Outstanding</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-amber-600">
                      ${summary.outstanding.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((summary.outstanding / (summary.totalCollected + summary.outstanding)) * 100 || 0).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm font-medium">Refunded</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">
                      ${summary.refunded.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((summary.refunded / summary.totalCollected) * 100 || 0).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Payments</CardTitle>
          <CardDescription>
            Households with unpaid or partially paid orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {outstandingLoading ? (
            <div className="py-8">
              <InlineLoading message="Loading outstanding payments..." />
            </div>
          ) : !outstandingData?.outstanding || outstandingData.outstanding.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No outstanding payments
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Household</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Programs</th>
                    <th className="text-right py-3 px-4 font-medium whitespace-nowrap">Amount</th>
                    <th className="text-center py-3 px-4 font-medium whitespace-nowrap">Status</th>
                    <th className="text-right py-3 px-4 font-medium whitespace-nowrap">Days Since Order</th>
                    <th className="text-right py-3 px-4 font-medium whitespace-nowrap">Order Date</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingData.outstanding.map((payment) => (
                    <tr key={payment.orderId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <span className="font-medium">{payment.householdName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {payment.programs.length > 0 ? (
                            payment.programs.map((prog, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded whitespace-nowrap"
                              >
                                {prog}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">No programs</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                        ${payment.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={payment.status === 'unpaid' ? 'destructive' : 'default'}
                          className="whitespace-nowrap"
                        >
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={
                            payment.daysSinceCreated > 30
                              ? 'text-red-600 font-semibold'
                              : payment.daysSinceCreated > 14
                              ? 'text-amber-600 font-medium'
                              : 'text-muted-foreground'
                          }
                        >
                          {payment.daysSinceCreated} days
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-muted-foreground whitespace-nowrap">
                        {payment.orderDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
