import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { validateEnv } from "./lib/env";

// Validate environment variables at build time
if (process.env.NODE_ENV !== 'test') {
  try {
    validateEnv();
  } catch (error) {
    console.error('❌ Environment validation failed:');
    console.error(error instanceof Error ? error.message : error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️  Continuing in development mode, but fix environment variables before deploying');
    }
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            // Content-Security-Policy: restricts what resources the browser can load.
            // 'unsafe-inline' is required for Next.js inline scripts/styles.
            // Refine further (e.g. add nonces) post-launch if needed.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.sentry.io https://o*.ingest.sentry.io",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "frame-ancestors 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

// Wrap with Sentry config for error monitoring and source maps
export default withSentryConfig(nextConfig, {
  // Sentry organization and project
  org: "skiadmin-9z",
  project: "javascript-nextjs",

  // Source map upload auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload wider set of client source files for better stack trace resolution
  widenClientFileUpload: true,

  // Create a proxy API route to bypass ad-blockers
  tunnelRoute: "/monitoring-tunnel",

  // Suppress non-CI output
  silent: !process.env.CI,

  // Delete source maps after upload so they aren't shipped to clients (security)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Disable telemetry
  telemetry: false,
});
