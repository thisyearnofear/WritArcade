/**
 * Simple Rate Limiter for API endpoints
 * Uses in-memory store (single instance) - swap for Redis in production
 */

import { config } from './config'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (per-instance)
// In production, replace with Redis: @upstash/redis or ioredis
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Rate limiter configuration
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 10 // Max requests per window

/**
 * Check if request exceeds rate limit
 * @param identifier - Unique identifier (wallet address, IP, etc.)
 * @returns { allowed: boolean, remaining: number, resetIn: number }
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean
  remaining: number
  resetIn: number
} {
  // Skip if rate limiting is disabled in config
  if (!config.api.enableRateLimiting) {
    return { allowed: true, remaining: -1, resetIn: 0 }
  }

  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // No existing entry - first request
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    })
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS }
  }

  // Existing entry within window
  if (entry.count >= MAX_REQUESTS) {
    const resetIn = entry.resetTime - now
    return { allowed: false, remaining: 0, resetIn }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(identifier, entry)

  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.count,
    resetIn: entry.resetTime - now,
  }
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
}