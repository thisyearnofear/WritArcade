import * as Sentry from '@sentry/nextjs'

/**
 * Server-side error reporting.
 *
 * Centralizes Sentry capture for API route catch blocks. No-ops outside
 * production so local development stays quiet, and never throws — error
 * reporting must never break the request path.
 */
export function reportServerError(
  error: unknown,
  context?: { route?: string; [key: string]: unknown }
): void {
  try {
    if (process.env.NODE_ENV !== 'production') {
      return
    }
    Sentry.captureException(error, context ? { extra: context } : undefined)
  } catch {
    // Swallow: reporting must not affect the response
  }
}
