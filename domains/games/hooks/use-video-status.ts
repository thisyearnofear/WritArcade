'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export type VideoPanelStatus = {
  id: string
  panelIndex: number
  videoStatus: 'idle' | 'pending' | 'completed' | 'failed'
  videoUrl: string | null
}

export interface UseVideoStatusResult {
  status: 'idle' | 'pending' | 'completed' | 'failed'
  panels: VideoPanelStatus[]
  isLoading: boolean
  error: string | null
  mutate: () => Promise<void>
}

export function useVideoStatus(slug: string, enabled = true): UseVideoStatusResult {
  const [status, setStatus] = useState<UseVideoStatusResult['status']>('idle')
  const [panels, setPanels] = useState<VideoPanelStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchStatus = useCallback(async () => {
    const response = await fetch(`/api/games/${slug}/video/status`)
    const json = (await response.json()) as {
      success: boolean
      data?: { status: UseVideoStatusResult['status']; panels: VideoPanelStatus[] }
      error?: string
    }

    if (!response.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch video status')
    }

    setStatus(json.data?.status ?? 'idle')
    setPanels(json.data?.panels ?? [])
  }, [slug])

  const mutate = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [fetchStatus])

  useEffect(() => {
    if (!enabled) return

    void mutate()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, fetchStatus, mutate])

  // Poll only while generation is in flight — once the status reaches a
  // terminal state (idle/completed/failed), further polling is pure waste.
  useEffect(() => {
    if (!enabled || status !== 'pending') return

    intervalRef.current = setInterval(() => {
      void fetchStatus()
    }, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, status, fetchStatus])

  return { status, panels, isLoading, error, mutate }
}
