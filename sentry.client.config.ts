// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Unless you're using a self-hosted version, you can leave `tunnelRoute` commented out
  // tunnelRoute: '/api/sentry',
  
  // Only send errors in production by default
  enabled: process.env.NODE_ENV === 'production',
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  
  // Session replay (optional — uncomment to enable)
  // replaysSessionSampleRate: 0.1,
  // replaysOnErrorSampleRate: 1.0,
})
