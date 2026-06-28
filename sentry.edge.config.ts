// This file configures the initialization of Sentry on the edge runtime.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Only send errors in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Edge runtime — minimal tracing
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
})
