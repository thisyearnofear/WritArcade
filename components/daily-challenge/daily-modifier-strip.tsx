'use client'

import { Sparkles, Lock } from 'lucide-react'
import {
  getModifierCategoryForPanel,
  MODIFIER_CATEGORY_HINT,
  MODIFIER_CATEGORY_LABEL,
} from '@/lib/daily-challenge-ui'

interface DailyModifierStripProps {
  /** 0-based index of the panel currently in play */
  panelIndex: number
  primaryColor?: string
}

/**
 * Shown during Daily Challenge gameplay — teases the hidden modifier category
 * without revealing the dealt card (stays encrypted until finale).
 */
export function DailyModifierStrip({ panelIndex, primaryColor = '#a855f7' }: DailyModifierStripProps) {
  const category = getModifierCategoryForPanel(panelIndex)
  const label = MODIFIER_CATEGORY_LABEL[category]
  const hint = MODIFIER_CATEGORY_HINT[category]
  const cardNumber = Math.min(panelIndex + 1, 5)

  return (
    <div
      className="w-full max-w-5xl mb-4 rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{
        borderColor: `${primaryColor}40`,
        backgroundColor: `${primaryColor}12`,
      }}
    >
      <div className="flex items-center gap-2 shrink-0">
        <Sparkles className="w-4 h-4" style={{ color: primaryColor }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: primaryColor }}>
          Daily Challenge
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">
          Hidden hand · Card {cardNumber}/5 · <span style={{ color: primaryColor }}>{label}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}. The exact card stays encrypted until you finish.</p>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground shrink-0">
        <Lock className="w-3 h-3" />
        <span>On-chain deck</span>
      </div>
    </div>
  )
}
