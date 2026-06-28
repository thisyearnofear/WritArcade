/**
 * AI Generation Cache
 *
 * Caches game generation results so identical requests (same article URL +
 * genre + difficulty) return the cached result for 24 hours. This reduces
 * AI API costs and speeds up repeat generations.
 *
 * Also provides request deduplication so concurrent identical requests
 * share one in-flight promise (see `deduplicateGeneration`).
 */

import { deduplicate } from './request-dedup'
import { cacheGet, cacheSet } from './cache'

const GENERATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface GenerationCacheKey {
  url?: string
  genre?: string
  difficulty?: string
  mode: 'story' | 'wordle'
}

/**
 * Build a deterministic cache key from generation parameters.
 */
export function buildGenerationCacheKey(params: GenerationCacheKey): string {
  const parts = [
    'ai:gen',
    params.mode,
    params.url || '',
    params.genre || '',
    params.difficulty || '',
  ]
  return parts.join(':')
}

/**
 * Try to read a cached generation result.
 */
export function getCachedGeneration<T>(key: string): T | null {
  return cacheGet<T>(key, GENERATION_CACHE_TTL_MS)
}

/**
 * Write a generation result to cache.
 */
export function setCachedGeneration<T>(key: string, data: T): void {
  cacheSet(key, data)
}

/**
 * Execute a generation function with deduplication — concurrent calls with
 * the same cache key share one in-flight promise.
 *
 * Does NOT cache the result; use `getCachedGeneration` / `setCachedGeneration`
 * for persistence. This only prevents duplicate in-flight AI calls within a
 * short window (~until the promise settles).
 */
export function deduplicateGeneration<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  return deduplicate(key, fn)
}
