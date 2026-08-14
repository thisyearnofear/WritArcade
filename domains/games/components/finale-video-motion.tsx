'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useVideoStatus, type VideoPanelStatus } from '../hooks/use-video-status'
import { trackEvent } from '@/services/analytics'
import type { VideoStyle } from '../services/video-generation.types'

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
  enabled: boolean
  status: 'idle' | 'pending' | 'completed' | 'failed'
  panels: VideoPanelStatus[]
  isStarting: boolean
  error: string | null
  style: VideoStyle
  setStyle: (style: VideoStyle) => void
  firstVideoUrl: string | null
  getPanelVideo: (panelId: string) => VideoPanelStatus | undefined
    start: () => Promise<void>
  /**
   * Stage 3 — paid whole-comic "Animate the whole comic" montage. Charges the
   * `video-montage` cost and renders a final clip for every panel, watched by
   * polling status per panel.
   */
  startMontage: () => Promise<void>
  /**
   * Stage 1 — free per-panel "Preview the look": lock the master still for the
   * panel at `panelIndex` (defaults to the hero) so it can be validated.
   */
  preview: (panelIndex?: number) => Promise<boolean>
  /**
   * Stage 2 — free per-panel "Check the motion": draft a short 3s clip from the
   * locked still of panel `panelIndex` (defaults to the hero). Idempotent and
   * rate-limited; no credit charge.
   */
  draft: (panelIndex?: number) => Promise<boolean>
  /** Re-fetch video status (used after starting a companion wide clip). */
  refresh: () => Promise<void>
}

/**
 * Owns the video animation upsell data flow for the comic finale:
 * status polling, per-panel lookup, start request, style selection,
 * isStarting/error lifecycle. Rendered UI (Animate button, style modal,
 * VideoShowcase/CreatorStats) lives in the presentational components below.
 */
export function useVideoMotion(gameSlug: string): VideoMotion {
  const videoEnabled = process.env.NEXT_PUBLIC_FEATURE_VIDEO_PIPELINE === 'true'
  const { enabled, status, panels: videoPanels, mutate: mutateVideoStatus } = useVideoStatus(gameSlug, videoEnabled)
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
            if (json.data?.status === 'pending' || json.data?.status === 'completed') {
        trackEvent('animation_started', { surface: 'finale', mode: 'hero', style })
      }
      await mutateVideoStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start video generation')
    } finally {
      setIsStarting(false)
    }
  }, [gameSlug, mutateVideoStatus, style])

  const startMontage = useCallback(async () => {
    setIsStarting(true)
    setError(null)
    try {
      const response = await fetch(`/api/games/${gameSlug}/video/montage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style }),
      })
      const json = (await response.json()) as { success: boolean; error?: string; data?: { status: string } }
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to start the whole-comic animation')
      }
      if (json.data?.status === 'pending' || json.data?.status === 'completed') {
        trackEvent('animation_started', { surface: 'finale', mode: 'montage', style })
      }
      await mutateVideoStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start the whole-comic animation')
    } finally {
      setIsStarting(false)
    }
  }, [gameSlug, mutateVideoStatus, style])

  const preview = useCallback(async (panelIndex?: number) => {
    setIsStarting(true)
    setError(null)
    try {
      const response = await fetch(`/api/games/${gameSlug}/video/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panelIndex }),
      })
      const json = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not preview this panel')
      trackEvent('panel_previewed', { surface: 'finale', panelIndex })
      await mutateVideoStatus()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not preview this panel')
      return false
    } finally {
      setIsStarting(false)
    }
  }, [gameSlug, mutateVideoStatus])

  const draft = useCallback(async (panelIndex?: number) => {
    setIsStarting(true)
    setError(null)
    try {
      const response = await fetch(`/api/games/${gameSlug}/video/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panelIndex }),
      })
      const json = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not check motion for this panel')
      trackEvent('panel_drafted', { surface: 'finale', panelIndex })
      await mutateVideoStatus()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check motion for this panel')
      return false
    } finally {
      setIsStarting(false)
    }
  }, [gameSlug, mutateVideoStatus])

  const getPanelVideo = useCallback(
    (panelId: string) => videoStatusByPanel.get(panelId),
    [videoStatusByPanel]
  )

  const firstVideoUrl = useMemo(
    () => videoPanels.find((p) => p.videoUrl)?.videoUrl ?? null,
    [videoPanels]
  )

  useEffect(() => {
    if (status === 'completed') trackEvent('animation_completed', { surface: 'finale', mode: 'hero' })
    if (status === 'failed') trackEvent('animation_failed', { surface: 'finale', mode: 'hero' })
  }, [status])

  return { enabled, status, panels: videoPanels, isStarting, error, style, setStyle, firstVideoUrl, getPanelVideo, start, startMontage, preview, draft, refresh: mutateVideoStatus }
}
