'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Clapperboard, Loader2, Sparkles } from 'lucide-react'
import { CREDITS_CONFIG } from '@/lib/writer-coins'
import { VideoStyleSelector } from './video-style-selector'
import { VideoShowcase } from './video-showcase'
import { CreatorStats } from './creator-stats'
import type { VideoMotion, VideoMotionProps } from './finale-video-motion'
import type { VideoStyle } from '../services/video-generation.types'

/* ─── Video upsell CTA (Animate / Animated button + error) ─────────────── */

export function VideoUpsellCTA({
  video,
  onOpenStyleModal,
  onWatch,
  onStartMontage,
}: {
  video: VideoMotion
  onOpenStyleModal: () => void
  onWatch: () => void
  /** Optional: pay the `video-montage` cost to animate the WHOLE comic at once. */
  onStartMontage?: () => void
}) {
  const { status, isStarting, error } = video
  const completed = status === 'completed'
  const videoCost = CREDITS_CONFIG.cost['video-upsell']
  const montageCost = CREDITS_CONFIG.cost['video-montage']

  return (
    <>
      <Button
        variant="outline"
        className="gap-2 border-purple-500/40 text-purple-200 hover:bg-purple-500/10"
        onClick={completed ? onWatch : onOpenStyleModal}
        disabled={isStarting || status === 'pending'}
        title={
          completed
            ? 'Watch your animated final-panel reveal'
            : `Animate your final panel as a short shareable reveal (${videoCost} credits)`
        }
      >
        {isStarting || status === 'pending' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Clapperboard className="w-4 h-4" />
        )}
        {completed ? (
          'Watch animated ending'
        ) : isStarting ? (
          'Starting…'
        ) : status === 'pending' ? (
          'Animating…'
        ) : (
          <>
            Optional animation
            <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">
              {videoCost} credits
            </span>
          </>
        )}
      </Button>

            {error && (
        <span className="text-xs text-red-400 px-2 py-1 bg-red-500/10 rounded">{error}</span>
      )}

      {/* Whole-comic montage: animate every panel at once. Mutually exclusive with
          the hero upsell (one reservation per game). Hidden once a video is done. */}
      {onStartMontage && !completed && status !== 'pending' && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-purple-500/40 text-purple-200 hover:bg-purple-500/10"
          onClick={onStartMontage}
          disabled={isStarting}
          title={`Animate the whole comic, panel by panel (${montageCost} credits)`}
        >
          <Clapperboard className="w-4 h-4" />
          <span className="hidden sm:inline">Whole comic</span>
          <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">{montageCost} credits</span>
        </Button>
      )}
    </>
  )
}

/* ─── Cinematic view-mode toggle (only when animation exists) ───────────── */

export function CinematicToggleButton({
  video,
  active,
  primaryColor,
  onClick,
}: {
  video: VideoMotion
  active: boolean
  primaryColor: string
  onClick: () => void
}) {
  if (video.status !== 'completed') return null
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className="gap-2"
      style={{
        backgroundColor: active ? primaryColor : undefined,
        borderColor: primaryColor,
      }}
    >
      <Clapperboard className="w-4 h-4" />
      Watch ending
    </Button>
  )
}

/* ─── Video style selection modal ───────────────────────────────────────── */

export function VideoStyleModal({
  style,
  onStyleChange,
  primaryColor,
  onClose,
  onStart,
  slug,
}: {
  style: VideoStyle
  onStyleChange: (s: VideoStyle) => void
  primaryColor: string
  onClose: () => void
  onStart: () => void
  slug: string
}) {
  // Stage 1 — FREE "Preview & lock the look": lock the master frame before any
  // credit spend on video (this is where credits die). Stills are cheap.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const requestPreview = async () => {
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const response = await fetch(`/api/games/${slug}/video/preview`, { method: 'POST' })
      const json = (await response.json()) as { success?: boolean; data?: { previewUrl?: string | null; alreadyLocked?: boolean }; error?: string }
      if (!response.ok || !json.success || !json.data?.previewUrl) {
        throw new Error(json.error || 'Could not preview the look.')
      }
      setPreviewUrl(json.data.previewUrl)
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Could not preview the look.')
    } finally {
      setPreviewLoading(false)
    }
  }

  // Stage 2 — FREE "Check the motion": a short 3s single-move draft from the
  // locked still, so the writer validates motion before the 50-credit commit.
  const [draftUrl, setDraftUrl] = useState<string | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const draftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startDraft = async () => {
    setDraftLoading(true)
    setDraftError(null)
    try {
      const response = await fetch(`/api/games/${slug}/video/draft`, { method: 'POST' })
      const json = (await response.json().catch(() => null)) as {
        success?: boolean
        data?: { draftStatus?: string; videoDraftUrl?: string | null }
        error?: string
      } | null
      if (!response.ok || !json?.success) {
        throw new Error(json?.error || 'Could not start the motion draft.')
      }
      if (json.data?.videoDraftUrl) {
        setDraftUrl(json.data.videoDraftUrl)
        setDraftLoading(false)
        return
      }

      // Draft is async — poll the status endpoint until the clip lands.
      if (draftTimerRef.current) clearInterval(draftTimerRef.current)
      draftTimerRef.current = setInterval(async () => {
        try {
          const sres = await fetch(`/api/games/${slug}/video/status`)
          const sjson = (await sres.json().catch(() => null)) as { data?: { panels?: Array<{ id: string; videoDraftUrl?: string | null; videoDraftStatus?: string }> } } | null
          const panel = sjson?.data?.panels?.find((p) => p.videoDraftUrl || p.videoDraftStatus === 'pending')
          if (panel?.videoDraftUrl) {
            setDraftUrl(panel.videoDraftUrl)
            setDraftLoading(false)
            if (draftTimerRef.current) clearInterval(draftTimerRef.current)
          } else if (panel && panel.videoDraftStatus === 'failed') {
            setDraftError('The motion draft failed.')
            setDraftLoading(false)
            if (draftTimerRef.current) clearInterval(draftTimerRef.current)
          }
        } catch {
          // Transient — keep polling.
        }
      }, 5000)
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Could not start the motion draft.')
      setDraftLoading(false)
    }
  }

  // Clear the draft poller when the modal unmounts.
  useEffect(() => () => {
    if (draftTimerRef.current) clearInterval(draftTimerRef.current)
  }, [])

  // Radix Dialog provides the focus trap, scroll lock, Escape-to-close,
  // and a built-in close button in the top-right corner.
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl border-purple-500/30 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Clapperboard className="h-5 w-5 text-purple-400" />
            Optional animation
          </DialogTitle>
          <DialogDescription>
            Lock the frame for free, then commit to the 5-second reveal. Five seconds,
            720p, native vertical ratio — never crop a wide clip for Stories.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step 1 · Lock the look (free)
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            See the master frame your reveal will animate — before you spend any credits.
          </p>
          {previewUrl ? (
            <div className="mt-3">
              <img
                src={previewUrl}
                alt="Locked animation frame preview"
                className="w-full rounded-lg border border-white/10"
              />
              <p className="mt-2 text-xs text-emerald-300">
                ✓ Frame locked. This is the object, light and grade your reveal will animate from.
              </p>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void requestPreview()}
              disabled={previewLoading}
              className="mt-3 gap-2 border-purple-500/40 text-purple-200 hover:bg-purple-500/10"
            >
              {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {previewLoading ? 'Locking…' : 'Preview the look · free'}
            </Button>
          )}
          {previewError && <p className="mt-2 text-xs text-red-400">{previewError}</p>}
        </div>

        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step 2 · Check the motion (free)
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            A short 3-second draft of one camera move — see how it moves before you pay.
          </p>
          {draftUrl ? (
            <video
              src={draftUrl}
              controls
              playsInline
              className="mt-3 w-full rounded-lg border border-white/10 bg-black"
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void startDraft()}
              disabled={draftLoading || !previewUrl}
              className="mt-3 gap-2 border-purple-500/40 text-purple-200 hover:bg-purple-500/10"
              title={previewUrl ? 'Generate a free 3s motion draft' : 'Lock the look first (free)'}
            >
              {draftLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {draftLoading ? 'Checking motion…' : 'Check the motion · free'}
            </Button>
          )}
          {draftError && <p className="mt-2 text-xs text-red-400">{draftError}</p>}
        </div>

        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step 3 · Choose the motion
          </p>
          <VideoStyleSelector value={style} onChange={onStyleChange} />
        </div>
        <div className="mt-2 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onStart}
            className="gap-2"
            style={{ backgroundColor: primaryColor, color: 'white' }}
          >
            <Clapperboard className="h-4 w-4" />
            Animate final panel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Cinematic view content (showcase + creator stats) ─────────────────── */

export function FinaleCinematicView({
  video,
  panels,
  primaryColor,
  gameTitle,
  genre,
  gameInsights,
  insightsLoading,
  slug,
}: {
  video: VideoMotion
  panels: VideoMotionProps['panels']
  primaryColor: string
  gameTitle: string
  genre: string
  gameInsights: { starts: number; completions: number } | null
  insightsLoading: boolean
  slug: string
}) {
  const creatorMilestones = (() => {
    const list: string[] = []
    if (video.status === 'completed') list.push('First animation')
    if (gameInsights && gameInsights.completions > 0) {
      list.push(`${gameInsights.completions} completion${gameInsights.completions === 1 ? '' : 's'}`)
    }
    return list
  })()

  // Best-effort: ask the server to generate the native 16:9 wide version from
  // the same locked still. No extra credit charge; refreshes status so the
  // ratio toggle appears when complete.
  const onRequestCompanion = async () => {
    try {
      const response = await fetch(`/api/games/${slug}/video/companion`, { method: 'POST' })
      const json = (await response.json().catch(() => null)) as { success?: boolean } | null
      const ok = response.ok && Boolean(json?.success)
      if (ok) await video.refresh()
      return ok
    } catch {
      return false
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <VideoShowcase
                panels={panels.map((p, i) => ({
          id: p.id,
          panelIndex: i,
          narrativeText: p.narrativeText,
          videoUrl: video.getPanelVideo(p.id)?.videoUrl ?? null,
          imageUrl: p.imageUrl,
          videoCompanionUrl: video.getPanelVideo(p.id)?.videoCompanionUrl ?? null,
          videoDraftUrl: video.getPanelVideo(p.id)?.videoDraftUrl ?? null,
        }))}
        primaryColor={primaryColor}
        gameTitle={gameTitle}
        autoPlay={false}
        aspectRatio="vertical"
        onRequestCompanion={onRequestCompanion}
      />
      <CreatorStats
        gameTitle={gameTitle}
        genre={genre}
        totalPanels={panels.length}
        hasAnimation={video.status === 'completed'}
        playCount={gameInsights?.starts ?? 0}
        viewCount={0}
        shareCount={0}
        milestones={creatorMilestones}
        isLoading={insightsLoading}
      />
    </div>
  )
}

/* ─── Self-contained section: wire the hook to the UI pieces ──────────────
   Consumers that only need the data flow can import `useVideoMotion` from
   './finale-video-motion' directly and render their own controls. */
