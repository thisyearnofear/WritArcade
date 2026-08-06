'use client'

import { Lock, Spade } from 'lucide-react'

interface HiddenHandTeaserProps {
  /** Panels completed so far, for the progress note. */
  panelsDone?: number
  className?: string
}

/**
 * Compact daily-challenge teaser: the 5 encrypted modifier cards exist and
 * shape the story, but stay quiet until the finale reveal. Designed to sit in
 * the desktop gameplay sidebar or as a slim card below the hero screen —
 * unlike the full ModifierReveal card, it never pushes gameplay off-screen.
 */
export function HiddenHandTeaser({ panelsDone, className = '' }: HiddenHandTeaserProps) {
  return (
    <div className={`rounded-xl border border-purple-500/25 bg-purple-950/25 p-4 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <Spade className="h-4 w-4 text-purple-400" aria-hidden />
        <h3 className="text-sm font-bold text-white">Hidden Hand</h3>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex aspect-[3/4] flex-1 items-center justify-center rounded border border-purple-500/25 bg-purple-950/50"
          >
            <Lock className="h-3 w-3 text-purple-400/50" aria-hidden />
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        {typeof panelsDone === 'number' && panelsDone > 0
          ? `${Math.min(panelsDone, 5)} of 5 panels shaped — your hand reveals at the finale.`
          : '5 encrypted cards shape every panel — revealed at the finale.'}
      </p>
    </div>
  )
}
