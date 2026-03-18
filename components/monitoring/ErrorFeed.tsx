"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, AlertCircle } from 'lucide-react'

export interface SentryError {
  id: string
  title: string
  message: string
  level: string
  count: number
  userCount: number
  firstSeen: string
  lastSeen: string
  status: string
  permalink: string
  severity: 'critical' | 'error' | 'warning' | 'info'
}

interface ErrorFeedProps {
  errors: SentryError[]
  loading?: boolean
  configured?: boolean
}

export function ErrorFeed({ errors, loading, configured }: ErrorFeedProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-foreground'
      case 'error':
        return 'bg-red-500 text-foreground'
      case 'warning':
        return 'bg-yellow-500 text-foreground'
      default:
        return 'bg-zinc-500 text-foreground'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return '🔴'
      case 'warning':
        return '⚠️'
      default:
        return '🟡'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading errors...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Sentry API not configured
            </p>
            <div className="text-xs text-left bg-card p-4 rounded-lg max-w-md mx-auto">
              <p className="font-medium mb-2">To enable error feed:</p>
              <ol className="list-decimal list-inside space-y-1 text-foreground">
                <li>Get auth token from Sentry</li>
                <li>Add SENTRY_AUTH_TOKEN to .env.local</li>
                <li>Restart server</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Error Feed</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://sentry.io/organizations/skiadmin-9z/issues/', '_blank')}
          >
            View All in Sentry
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="max-h-[600px] overflow-y-auto">
        {errors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <span className="text-4xl mb-4 block">🎉</span>
            <p>No errors in the last 24 hours!</p>
            <p className="text-xs mt-2">Your app is running smoothly.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {errors.map((error) => (
              <div
                key={error.id}
                className="border rounded-lg p-4 hover:bg-card transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-lg">{getSeverityIcon(error.severity)}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1 truncate">{error.title}</h4>
                      {error.message && (
                        <p className="text-xs text-muted-foreground truncate">{error.message}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={getSeverityColor(error.severity)}>
                    {error.severity}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <div className="flex items-center gap-3">
                    <span>{formatTimeAgo(error.lastSeen)}</span>
                    <span>•</span>
                    <span>{error.count} events</span>
                    {error.userCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{error.userCount} users</span>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => window.open(error.permalink, '_blank')}
                  >
                    View
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
