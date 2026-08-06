'use client'

import { BookOpen, Clapperboard, Zap } from 'lucide-react'
import { CREDITS_CONFIG } from '@/lib/writerCoins'

interface FinaleUnlocksStripProps {
  panelsDone: number
  maxPanels?: number
  primaryColor?: string
}

/**
 * Slim persistent promise shown during play: finishing all panels unlocks
 * the full comic, a mintable NFT, and the animated cut. Sets the expectation
 * (and the video's price) long before the finale so the upsell never lands
 * as a surprise.
 */
export function FinaleUnlocksStrip({
  panelsDone,
  maxPanels = 5,
  primaryColor = '#8b5cf6',
}: FinaleUnlocksStripProps) {
  if (panelsDone >= maxPanels) return null

  const items = [
    { icon: BookOpen, label: 'Full comic' },
    { icon: Zap, label: 'Mintable NFT' },
    { icon: Clapperboard, label: `Animated cut · ${CREDITS_CONFIG.cost['video-upsell']} credits` },
  ]

  return (
    <div className="mb-4 flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2">
      <span
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color: primaryColor }}
      >
        Finish to unlock
      </span>
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
        >
          <item.icon className="h-3 w-3" style={{ color: primaryColor }} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  )
}
