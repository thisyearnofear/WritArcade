'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'wa:recently-played'
const MAX_ENTRIES = 12

export interface RecentlyPlayedEntry {
  slug: string
  title: string
  playedAt: number // epoch ms
}

/**
 * Tracks games the user has played, stored client-side in localStorage.
 * No auth or schema required — works for guest and logged-in users alike.
 *
 * The list is capped at MAX_ENTRIES; new plays move a game to the front
 * (most-recent-first) and deduplicate by slug.
 */
export function useRecentlyPlayed() {
  const [entries, setEntries] = useState<RecentlyPlayedEntry[]>([])

  // Hydrate from localStorage on mount (client-only to avoid SSR mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe hydration
        setEntries(parsed.slice(0, MAX_ENTRIES) as RecentlyPlayedEntry[])
      }
    } catch {
      // Corrupt JSON — silently reset
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const trackPlay = useCallback((slug: string, title: string) => {
    if (!slug) return
    const entry: RecentlyPlayedEntry = { slug, title, playedAt: Date.now() }

    setEntries((prev) => {
      // Remove any existing entry for this slug, then prepend
      const filtered = prev.filter((e) => e.slug !== slug)
      const next = [entry, ...filtered].slice(0, MAX_ENTRIES)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // localStorage full or unavailable — state still updates in-memory
      }
      return next
    })
  }, [])

  const clearRecentlyPlayed = useCallback(() => {
    setEntries([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  return { entries, trackPlay, clearRecentlyPlayed }
}
