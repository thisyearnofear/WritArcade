'use client'

import { motion } from 'framer-motion'
import { Sparkles, ShieldCheck } from 'lucide-react'
import {
  getModifierCategoryForPanel,
  MODIFIER_CATEGORY_HINT,
  MODIFIER_CATEGORY_LABEL,
  MODIFIER_CATEGORY_COLOR,
} from '@/lib/daily-challenge/daily-challenge-ui'
import { EncryptedStateIndicator } from './encrypted-state-indicator'

interface DailyModifierStripProps {
  /** 0-based index of the panel currently in play */
  panelIndex: number
  primaryColor?: string
  /** The encrypted handle for the current card (from on-chain session) */
  modifierHandle?: string | null
  /** The encrypted score handle */
  scoreHandle?: string | null
}

/**
 * Shown during Daily Challenge gameplay — teases the hidden modifier category
 * without revealing the dealt card (stays encrypted until finale).
 *
 * ENHANCEMENT: Now shows live ciphertext fragments from the on-chain handle,
 * making Inco's confidential compute *visible* to the player and judges.
 */
export function DailyModifierStrip({
  panelIndex,
  primaryColor = '#a855f7',
  modifierHandle,
  scoreHandle,
}: DailyModifierStripProps) {
  const category = getModifierCategoryForPanel(panelIndex)
  const label = MODIFIER_CATEGORY_LABEL[category]
  const hint = MODIFIER_CATEGORY_HINT[category]
  const categoryColor = MODIFIER_CATEGORY_COLOR[category]
  const cardNumber = Math.min(panelIndex + 1, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-5xl mb-4 rounded-lg border px-4 py-3 flex flex-col gap-3"
      style={{
        borderColor: `${primaryColor}40`,
        backgroundColor: `${primaryColor}08`,
      }}
    >
      {/* Top row: badge + card info */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles className="w-4 h-4" style={{ color: primaryColor }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: primaryColor }}>
            Daily Challenge
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">
            Hidden hand · Card {cardNumber}/5 · <span style={{ color: categoryColor }}>{label}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hint}. The exact card stays encrypted on-chain until you finish all 5 panels.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <IncoNetworkPill />
        </div>
      </div>

      {/* Bottom row: live encrypted state visualization */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
        <EncryptedStateIndicator
          handle={modifierHandle}
          label={`Card ${cardNumber}`}
          color={categoryColor}
          size="sm"
        />
        {scoreHandle && (
          <EncryptedStateIndicator
            handle={scoreHandle}
            label="Score"
            color={primaryColor}
            size="sm"
          />
        )}
        <span className="text-[9px] text-muted-foreground/60 ml-auto hidden sm:inline">
          Confidential compute on Base via Inco Lightning
        </span>
      </div>
    </motion.div>
  )
}

/** Small network pill showing the Inco shield + "On-chain" */
function IncoNetworkPill() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/25 bg-purple-500/8 px-2.5 py-1">
      <ShieldCheck className="w-3 h-3 text-purple-400" />
      <span className="text-[10px] font-semibold text-purple-300">
        On-chain encrypted
      </span>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
    </div>
  )
}
