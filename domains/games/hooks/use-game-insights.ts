'use client'

import { useState, useEffect, useCallback } from 'react'

export interface GameInsights {
  starts: number
  completions: number
  resonance: number | null
  embeddedStarts: number
}

export interface UseGameInsightsResult {
  insights: GameInsights | null
  isLoading: boolean
  mutate: () => Promise<void>
}

export function useGameInsights(slug: string, enabled = true): UseGameInsightsResult {
  const [insights, setInsights] = useState<GameInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchInsights = useCallback(async () => {
    const response = await fetch(`/api/games/${slug}/insights`)
    const json = (await response.json()) as {
      success: boolean
      data?: GameInsights
      error?: string
    }

    // Insights are owner-gated; non-owners should fail silently.
    if (response.status === 403) {
      setInsights(null)
      return
    }

    if (!response.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch insights')
    }

    setInsights(json.data ?? null)
  }, [slug])

  const mutate = useCallback(async () => {
    if (!enabled) return
    setIsLoading(true)
    try {
      await fetchInsights()
    } catch (err) {
      // Insights are best-effort; failures are silent.
      console.error('[useGameInsights] Failed to load insights:', err)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, fetchInsights])

  useEffect(() => {
    void mutate()
  }, [mutate])

  return { insights, isLoading, mutate }
}
