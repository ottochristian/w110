"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface Metric {
  count?: number
  amount?: number
  formatted?: string
  trend: string
  trendDirection: 'up' | 'down' | 'flat'
  sparkline?: number[]
  rate?: string
  average?: number
  p95?: number
  period?: string
}

export interface MetricsData {
  registrations?: Metric
  revenue?: Metric
  failedPayments?: Metric
  activeSessions?: Metric & { count: number }
  apiPerformance?: Metric
  errors?: Metric
}

interface MetricsPanelProps {
  metrics: MetricsData | null
  loading?: boolean
}

export function MetricsPanel({ metrics, loading }: MetricsPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading metrics...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return null
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getTrendColor = (direction: string, inverse?: boolean) => {
    const isGood = inverse ? direction === 'down' : direction === 'up'
    return isGood ? 'text-green-600' : direction === 'down' ? 'text-red-600' : 'text-gray-600'
  }

  const renderSparkline = (data: number[] | undefined) => {
    if (!data || data.length === 0) return null

    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1

    return (
      <div className="flex items-end gap-0.5 h-8">
        {data.map((value, i) => {
          const height = ((value - min) / range) * 100
          return (
            <div
              key={i}
              className="flex-1 bg-primary rounded-sm opacity-70"
              style={{ height: `${Math.max(height, 5)}%` }}
              title={`${value}`}
            />
          )
        })}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Key Metrics (Last 24h)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Registrations */}
        {metrics.registrations && (
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-medium text-gray-600">📊 Registrations</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{metrics.registrations.count}</span>
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(metrics.registrations.trendDirection)}`}>
                    {getTrendIcon(metrics.registrations.trendDirection)}
                    <span>{metrics.registrations.trend}</span>
                  </div>
                </div>
              </div>
            </div>
            {renderSparkline(metrics.registrations.sparkline)}
          </div>
        )}

        {/* Revenue */}
        {metrics.revenue && (
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-medium text-gray-600">💰 Revenue</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{metrics.revenue.formatted}</span>
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(metrics.revenue.trendDirection)}`}>
                    {getTrendIcon(metrics.revenue.trendDirection)}
                    <span>{metrics.revenue.trend}</span>
                  </div>
                </div>
              </div>
            </div>
            {renderSparkline(metrics.revenue.sparkline)}
          </div>
        )}

        {/* Failed Payments */}
        {metrics.failedPayments && (
          <div className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-600">❌ Failed Payments</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{metrics.failedPayments.count}</span>
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(metrics.failedPayments.trendDirection, true)}`}>
                    {getTrendIcon(metrics.failedPayments.trendDirection)}
                    <span>{metrics.failedPayments.trend}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Sessions */}
        {metrics.activeSessions && (
          <div className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-600">📝 Active Sessions</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{metrics.activeSessions.count}</span>
                  <span className="text-sm text-gray-500">users online</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Performance */}
        {metrics.apiPerformance && (
          <div className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-600">⚡ API Response Time</h4>
                <div className="flex items-center gap-4 mt-1">
                  <div>
                    <span className="text-2xl font-bold">{metrics.apiPerformance.average}ms</span>
                    <span className="text-xs text-gray-500 ml-2">avg</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    P95: {metrics.apiPerformance.p95}ms
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Rate */}
        {metrics.errors && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-medium text-gray-600">🐛 Error Rate</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{metrics.errors.rate}</span>
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(metrics.errors.trendDirection, true)}`}>
                    {getTrendIcon(metrics.errors.trendDirection)}
                    <span>{metrics.errors.trend}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {metrics.errors.count} errors in last 24h
                </div>
              </div>
            </div>
            {renderSparkline(metrics.errors.sparkline)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
