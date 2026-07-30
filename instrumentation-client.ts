// This file configures the initialization of Sentry on the client.
// It replaces the legacy sentry.client.config.ts (Sentry SDK v10 / Next 16).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send errors in production by default
  enabled: process.env.NODE_ENV === 'production',

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
