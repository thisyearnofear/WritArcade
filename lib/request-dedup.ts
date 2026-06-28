/**
 * Request Deduplication Utility
 *
 * Prevents duplicate concurrent calls for the same key by returning the
 * same in-flight promise. Callers with the same key share one execution.
 *
 * The deduplication cache is keyed by a string and holds at most `maxSize`
 * entries (LRU-evicted). Promises are kept until they settle, after which
 * the entry is removed so a future call with the same key starts a fresh
 * request.
 *
 * @example
 * ```ts
 * const data = await deduplicate('games:featured', () =>
 *   prisma.game.findMany({ where: { featured: true } })
 * )
 * ```
 */

const inFlight = new Map<string, Promise<unknown>>()
const MAX_SIZE = 500

/**
 * Deduplicate concurrent async calls by key.
 *
 * If a call with the same key is already in-flight, return its promise.
 * Otherwise, execute `fn`, cache the promise, and remove it on settlement.
 */
export async function deduplicate<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined
  if (existing) return existing

  // LRU eviction when at capacity
  if (inFlight.size >= MAX_SIZE) {
    const firstKey = inFlight.keys().next().value
    if (firstKey !== undefined) inFlight.delete(firstKey)
  }

  const promise = fn().finally(() => {
    // Clean up after settlement so next call starts fresh
    inFlight.delete(key)
  })

  inFlight.set(key, promise)
  return promise
}

/**
 * Clear all in-flight deduplication entries.
 * Useful in tests or after server-side request completion.
 */
export function clearDedupCache(): void {
  inFlight.clear()
}

/**
 * Get the number of in-flight deduplication entries (for monitoring).
 */
export function dedupCacheSize(): number {
  return inFlight.size
}
