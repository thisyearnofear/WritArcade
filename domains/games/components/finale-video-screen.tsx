'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Clapperboard, Loader2 } from 'lucide-react'
import { CREDITS_CONFIG } from '@/lib/writerCoins'
import { VideoStyleSelector } from './video-style-selector'
import { VideoShowcase } from './video-showcase'
import { CreatorStats } from './creator-stats'
import type { VideoMotion, VideoMotionProps } from './finale-video-motion'
import type { VideoStyle } from '../services/video-generation.service'

/* ─── Video upsell CTA (Animate / Animated button + error) ─────────────── */

export function VideoUpsellCTA({
  video,
  onOpenStyleModal,
  onWatch,
}: {
  video: VideoMotion
  onOpenStyleModal: () => void
  onWatch: () => void
}) {
  const { status, isStarting, error } = video
  const completed = status === 'completed'
  const videoCost = CREDITS_CONFIG.cost['video-upsell']

  return (
    <>
      <Button
        variant="outline"
        className="gap-2 border-purple-500/40 text-purple-200 hover:bg-purple-500/10"
        onClick={completed ? onWatch : onOpenStyleModal}
        disabled={isStarting || status === 'pending'}
        title={
          completed
            ? 'Watch your animated comic'
            : `Bring all five panels to life as a short animated cut (${videoCost} credits)`
        }
      >
        {isStarting || status === 'pending' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Clapperboard className="w-4 h-4" />
        )}
        {completed ? (
          'Animated'
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
      Cinematic
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
}: {
  style: VideoStyle
  onStyleChange: (s: VideoStyle) => void
  primaryColor: string
  onClose: () => void
  onStart: () => void
}) {
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
            An optional 50-credit upgrade that turns your finished comic into a short animated cut.
          </DialogDescription>
        </DialogHeader>
        <VideoStyleSelector value={style} onChange={onStyleChange} />
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
Add animation
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
}: {
  video: VideoMotion
  panels: VideoMotionProps['panels']
  primaryColor: string
  gameTitle: string
  genre: string
  gameInsights: { starts: number; completions: number } | null
  insightsLoading: boolean
}) {
  const creatorMilestones = (() => {
    const list: string[] = []
    if (video.status === 'completed') list.push('First animation')
    if (gameInsights && gameInsights.completions > 0) {
      list.push(`${gameInsights.completions} completion${gameInsights.completions === 1 ? '' : 's'}`)
    }
    return list
  })()

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <VideoShowcase
        panels={panels.map((p, i) => ({
          id: p.id,
          panelIndex: i,
          narrativeText: p.narrativeText,
          videoUrl: video.getPanelVideo(p.id)?.videoUrl ?? null,
          imageUrl: p.imageUrl,
        }))}
        primaryColor={primaryColor}
        gameTitle={gameTitle}
        autoPlay={false}
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
