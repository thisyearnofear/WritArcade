'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useVideoStatus, type VideoPanelStatus } from '../hooks/use-video-status'
import type { VideoStyle } from '../services/video-generation.service'

export interface VideoPanelLike {
  id: string
  narrativeText: string
  imageUrl?: string | null
}

export interface VideoMotionProps {
  panels: VideoPanelLike[]
  /**
   * Persisted style preference, when the style picker lives in a parent
   * session hook instead of being collected by this feature.
   */
  videoStyle?: VideoStyle
}

export interface VideoMotion {
  status: 'idle' | 'pending' | 'completed' | 'failed'
  isStarting: boolean
  error: string | null
  style: VideoStyle
  setStyle: (style: VideoStyle) => void
  firstVideoUrl: string | null
  getPanelVideo: (panelId: string) => VideoPanelStatus | undefined
  start: () => Promise<void>
}

/**
 * Owns the video animation upsell data flow for the comic finale:
 * status polling, per-panel lookup, start request, style selection,
 * isStarting/error lifecycle. Rendered UI (Animate button, style modal,
 * VideoShowcase/CreatorStats) lives in the presentational components below.
 */
export function useVideoMotion(gameSlug: string): VideoMotion {
  const { status, panels: videoPanels, mutate: mutateVideoStatus } = useVideoStatus(gameSlug)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [style, setStyle] = useState<VideoStyle>('cinematic')

  const videoStatusByPanel = useMemo(() => {
    const map = new Map<string, VideoPanelStatus>()
    videoPanels.forEach((p) => map.set(p.id, p))
    return map
  }, [videoPanels])

  // Nudge an immediate refresh when the upsell is in flight so the UI
  // reflects progress right away instead of waiting for the next poll tick.
  useEffect(() => {
    if (status === 'pending') void mutateVideoStatus()
  }, [status, mutateVideoStatus])

  const start = useCallback(async () => {
    setIsStarting(true)
    setError(null)
    try {
      const response = await fetch(`/api/games/${gameSlug}/video/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style }),
      })
      const json = (await response.json()) as { success: boolean; error?: string; data?: { status: string } }
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to start video generation')
      }
      await mutateVideoStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start video generation')
    } finally {
      setIsStarting(false)
    }
  }, [gameSlug, mutateVideoStatus, style])

  const getPanelVideo = useCallback(
    (panelId: string) => videoStatusByPanel.get(panelId),
    [videoStatusByPanel]
  )

  const firstVideoUrl = useMemo(
    () => videoPanels.find((p) => p.videoUrl)?.videoUrl ?? null,
    [videoPanels]
  )

  return { status, isStarting, error, style, setStyle, firstVideoUrl, getPanelVideo, start }
}
