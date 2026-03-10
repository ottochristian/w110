'use client'

import React from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component that catches React errors and displays a fallback UI
 * Automatically reports errors to Sentry if configured
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 p-8">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Something went wrong</h2>
            <p className="text-muted-foreground max-w-md">
              We're sorry, but something unexpected happened. The error has been
              logged and we'll look into it.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-medium">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 rounded-md bg-muted p-4 text-xs overflow-auto max-w-2xl">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook-based error boundary using React 18's error boundaries
 * Use this for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

/**
 * Compact error fallback for smaller components
 */
export function CompactErrorFallback({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-3 border border-destructive/50 rounded-lg bg-destructive/5">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">Failed to load</p>
        <p className="text-xs text-muted-foreground">
          {process.env.NODE_ENV === 'development' ? error.message : 'Try again'}
        </p>
      </div>
      <Button onClick={reset} size="sm" variant="outline">
        Retry
      </Button>
    </div>
  )
}
