// Simple in-memory TTL cache for server/runtime use
const CACHE = new Map<string, { at: number; data: unknown }>()

export function cacheGet<T>(key: string, ttlMs: number): T | null {
  const hit = CACHE.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > ttlMs) { CACHE.delete(key); return null }
  return hit.data as T
}

export function cacheSet<T>(key: string, data: T) {
  CACHE.set(key, { at: Date.now(), data })
}

export function cacheClear(prefix?: string) {
  if (!prefix) return CACHE.clear()
  Array.from(CACHE.keys()).forEach(k => { if (k.startsWith(prefix)) CACHE.delete(k) })
}

/** Invalidate a single cache entry by key */
export function cacheDelete(key: string): void {
  CACHE.delete(key)
}

/** Get cache stats for monitoring */
export function cacheStats(): { size: number } {
  return { size: CACHE.size }
}
