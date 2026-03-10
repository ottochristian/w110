'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Global error page for the application
 * Catches all errors that aren't caught by error boundaries
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
          <div className="max-w-md space-y-6 text-center">
            <AlertCircle className="mx-auto h-20 w-20 text-destructive" />
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Oops! Something went wrong</h1>
              <p className="text-muted-foreground">
                We're sorry for the inconvenience. This error has been reported
                to our team.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm font-medium">
                  Technical details (dev only)
                </summary>
                <pre className="mt-2 overflow-auto rounded-md bg-muted p-4 text-xs">
                  {error.message}
                  {error.digest && `\nDigest: ${error.digest}`}
                  {'\n\n'}
                  {error.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <Button onClick={reset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/')}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
