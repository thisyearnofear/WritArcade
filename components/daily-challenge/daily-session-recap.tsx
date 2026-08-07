'use client'

import { useCallback, useState } from 'react'
import { Share2, Copy, Check, Trophy } from 'lucide-react'
import type { Modifier } from '@/lib/daily-challenge'
import { MODIFIER_CATEGORY_LABEL } from '@/lib/daily-challenge-ui'

interface DailySessionRecapProps {
  gameSlug: string
  gameTitle?: string
  modifiers: Modifier[]
  score: number
  rank?: number | null
  primaryColor?: string
}

export function DailySessionRecap({
  gameSlug,
  gameTitle,
  modifiers,
  score,
  rank,
  primaryColor = '#a855f7',
}: DailySessionRecapProps) {
  const [copied, setCopied] = useState(false)

  const handSummary = modifiers
    .map((m) => `${MODIFIER_CATEGORY_LABEL[m.category]}: ${m.name}`)
    .join(' · ')

  const shareText = [
    `Daily Challenge on WritersArcade — ${score}/50 points${rank ? ` (rank #${rank})` : ''}.`,
    `Hidden hand: ${handSummary}.`,
    gameTitle ? `Story: "${gameTitle}".` : '',
    typeof window !== 'undefined' ? `${window.location.origin}/games/${gameSlug}?play=1` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const copyRecap = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }, [shareText])

  const shareRecap = useCallback(() => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/games/${gameSlug}?play=1` : undefined
    if (navigator.share) {
      navigator.share({
        title: 'My Daily Challenge recap',
        text: shareText,
        url,
      }).catch(() => {})
      return
    }
    copyRecap()
  }, [copyRecap, gameSlug, shareText])

  return (
    <div
      className="mt-4 rounded-lg border p-4"
      style={{
        borderColor: `${primaryColor}35`,
        backgroundColor: `${primaryColor}08`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">Session recap</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{shareText}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyRecap}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy recap'}
        </button>
        <button
          type="button"
          onClick={shareRecap}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold text-black"
          style={{ backgroundColor: primaryColor }}
        >
          <Share2 className="h-3.5 w-3.5" />
          Share run
        </button>
      </div>
    </div>
  )
}
