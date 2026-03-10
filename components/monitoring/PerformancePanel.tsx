"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Database } from 'lucide-react'

interface EndpointPerformance {
  endpoint: string
  avgTime: number
  count: number
  maxTime: number
}

interface DatabasePerformance {
  avgQueryTime: number
  p95QueryTime: number
  slowQueries: number
  totalQueries: number
}

interface PerformanceData {
  slowestEndpoints?: EndpointPerformance[]
  database?: DatabasePerformance
  api?: {
    totalCalls: number
    avgResponseTime: number
    period: string
  }
}

interface PerformancePanelProps {
  performance: PerformanceData | null
  loading?: boolean
}

export function PerformancePanel({ performance, loading }: PerformancePanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading performance data...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!performance) {
    return null
  }

  const getPerformanceBadge = (time: number) => {
    if (time < 500) return <Badge className="bg-green-500">Fast</Badge>
    if (time < 2000) return <Badge className="bg-yellow-500">Moderate</Badge>
    return <Badge className="bg-red-500">Slow</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Indicators</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API Endpoints */}
        {performance.slowestEndpoints && performance.slowestEndpoints.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4" />
              <h4 className="text-sm font-semibold">API Endpoints (Slowest Last Hour)</h4>
            </div>
            <div className="space-y-2">
              {performance.slowestEndpoints.map((endpoint, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div className="flex-1 truncate">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{endpoint.endpoint}</code>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="font-medium">{endpoint.avgTime}ms</span>
                    {getPerformanceBadge(endpoint.avgTime)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Performance */}
        {performance.database && performance.database.totalQueries > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4" />
              <h4 className="text-sm font-semibold">Database Performance</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600">Average Query Time</p>
                <p className="text-lg font-bold">{performance.database.avgQueryTime}ms</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">P95 Query Time</p>
                <p className="text-lg font-bold">{performance.database.p95QueryTime}ms</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Slow Queries (&gt;500ms)</p>
                <p className="text-lg font-bold">{performance.database.slowQueries}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Queries</p>
                <p className="text-lg font-bold">{performance.database.totalQueries}</p>
              </div>
            </div>
          </div>
        )}

        {/* Overall API Stats */}
        {performance.api && performance.api.totalCalls > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Overall API Performance</p>
                <p className="text-sm font-medium">
                  {performance.api.totalCalls} calls • {performance.api.avgResponseTime}ms avg
                </p>
              </div>
              {getPerformanceBadge(performance.api.avgResponseTime)}
            </div>
          </div>
        )}

        {/* No data state */}
        {(!performance.slowestEndpoints || performance.slowestEndpoints.length === 0) && 
         (!performance.database || performance.database.totalQueries === 0) && (
          <div className="text-center py-8 text-gray-500">
            <p>No performance data yet</p>
            <p className="text-xs mt-2">Data will appear as your API handles requests</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
