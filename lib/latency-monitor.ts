/**
 * Latency Monitoring Middleware
 *
 * Wraps API route handlers with timing instrumentation that logs p50/p95/p99.
 * Use this to identify slow routes (target: p95 < 5s).
 *
 * @example
 * ```ts
 * import { monitorLatency } from '@/lib/latency-monitor'
 *
 * export const POST = monitorLatency('games/generate', async (request) => {
 *   // ... handler logic ...
 * })
 * ```
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface LatencySample {
  route: string
  durationMs: number
  status: 'success' | 'error'
  timestamp: number
}

// ── In-memory ring buffer ──────────────────────────────────────────────────

const MAX_SAMPLES = 10_000
const samples: LatencySample[] = []
let nextIndex = 0

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Wrap an API route handler with latency monitoring.
 * Automatically logs p50/p95/p99 for the route every `reportEvery` calls.
 */
export function monitorLatency<T>(
  routeName: string,
  handler: (...args: unknown[]) => Promise<Response>,
  reportEvery = 100,
): (...args: unknown[]) => Promise<Response> {
  let callCount = 0

  return async (...args: unknown[]): Promise<Response> => {
    const start = performance.now()

    try {
      const response = await handler(...args)
      const durationMs = performance.now() - start

      recordSample({ route: routeName, durationMs, status: 'success', timestamp: Date.now() })

      if (durationMs > 5_000) {
        console.warn(`[Latency] SLOW ROUTE ${routeName}: ${durationMs.toFixed(0)}ms`)
      }

      callCount++
      if (callCount % reportEvery === 0) {
        reportLatency(routeName)
      }

      return response
    } catch (error) {
      const durationMs = performance.now() - start
      recordSample({ route: routeName, durationMs, status: 'error', timestamp: Date.now() })
      callCount++
      throw error
    }
  }
}

/**
 * Force a latency report for a specific route (or all routes if omitted).
 */
export function reportLatency(routeName?: string): void {
  const relevant = routeName
    ? samples.filter((s) => s.route === routeName)
    : [...samples]

  if (relevant.length === 0) {
    console.log('[Latency] No samples to report.')
    return
  }

  const durations = relevant.map((s) => s.durationMs).sort((a, b) => a - b)
  const len = durations.length

  const p50 = percentile(durations, 0.5)
  const p95 = percentile(durations, 0.95)
  const p99 = percentile(durations, 0.99)
  const errors = relevant.filter((s) => s.status === 'error').length

  const label = routeName || 'all routes'
  console.log(
    `[Latency] ${label} (${len} samples): ` +
    `p50=${p50.toFixed(0)}ms p95=${p95.toFixed(0)}ms p99=${p99.toFixed(0)}ms ` +
    `errors=${errors}`,
  )
}

/**
 * Get raw latency stats (for API endpoint or dashboard).
 */
export function getLatencyStats(routeName?: string) {
  const relevant = routeName
    ? samples.filter((s) => s.route === routeName)
    : [...samples]

  if (relevant.length === 0) return null

  const durations = relevant.map((s) => s.durationMs).sort((a, b) => a - b)
  const len = durations.length

  return {
    route: routeName || '*',
    count: len,
    p50: percentile(durations, 0.5),
    p95: percentile(durations, 0.95),
    p99: percentile(durations, 0.99),
    min: durations[0],
    max: durations[len - 1],
    errors: relevant.filter((s) => s.status === 'error').length,
    avg: durations.reduce((a, b) => a + b, 0) / len,
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────

function recordSample(sample: LatencySample): void {
  samples[nextIndex] = sample
  nextIndex = (nextIndex + 1) % MAX_SAMPLES
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.ceil(p * sorted.length) - 1
  return sorted[Math.max(0, index)]
}
