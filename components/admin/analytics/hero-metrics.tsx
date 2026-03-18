'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUp, ArrowDown, DollarSign, Users, UserCheck, AlertCircle, TrendingUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  iconColor?: string
  loading?: boolean
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = 'text-orange-500',
  loading,
}: MetricCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn('p-2 rounded-full bg-secondary', iconColor)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="metric-value">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface HeroMetricsProps {
  data?: {
    totalRevenue: number
    netRevenue: number
    activeRegistrations: number
    confirmedCount: number
    pendingCount: number
    waitlistedCount: number
    activeAthletes: number
    activeHouseholds: number
    outstandingPayments: number
    outstandingAmount: number
  }
  loading?: boolean
}

export function HeroMetrics({ data, loading }: HeroMetricsProps) {

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Revenue */}
      <MetricCard
        title="Total Revenue"
        value={loading ? '...' : formatCurrency(data?.totalRevenue || 0)}
        subtitle={
          data?.netRevenue !== undefined
            ? `Net: ${formatCurrency(data.netRevenue)}`
            : undefined
        }
        icon={<DollarSign className="h-5 w-5" />}
        iconColor="text-green-500"
        loading={loading}
      />

      {/* Active Registrations */}
      <MetricCard
        title="Active Registrations"
        value={loading ? '...' : data?.activeRegistrations || 0}
        subtitle={
          data
            ? `${data.confirmedCount} confirmed, ${data.pendingCount} pending`
            : undefined
        }
        icon={<UserCheck className="h-5 w-5" />}
        iconColor="text-primary"
        loading={loading}
      />

      {/* Active Athletes */}
      <MetricCard
        title="Active Athletes"
        value={loading ? '...' : data?.activeAthletes || 0}
        subtitle={
          data ? `${data.activeHouseholds} households` : undefined
        }
        icon={<Users className="h-5 w-5" />}
        iconColor="text-purple-400"
        loading={loading}
      />

      {/* Outstanding Payments */}
      <MetricCard
        title="Outstanding Payments"
        value={loading ? '...' : formatCurrency(data?.outstandingAmount || 0)}
        subtitle={
          data ? `${data.outstandingPayments} households` : undefined
        }
        icon={<AlertCircle className="h-5 w-5" />}
        iconColor="text-amber-400"
        loading={loading}
      />
    </div>
  )
}
