'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { config } from '@/lib/config'

interface DailyChallengeBannerProps {
  className?: string
  compact?: boolean
}

interface DailyPreview {
  theme: string
  day: number
  deckShuffled?: boolean
}

export function DailyChallengeBanner({ className = '', compact = false }: DailyChallengeBannerProps) {
  const [preview, setPreview] = useState<DailyPreview | null>(null)

  useEffect(() => {
    if (!config.features.dailyChallenge) return

    fetch('/api/daily-challenge/start')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        const theme = data.challenge?.theme || data.source?.theme
        const day = data.challenge?.day || data.source?.day
        if (theme && day) {
          setPreview({ theme, day, deckShuffled: data.deckShuffled })
        }
      })
      .catch(() => {})
  }, [])

  if (!config.features.dailyChallenge) return null

  if (compact) {
    return (
      <Link
        href="/daily"
        className={`flex items-center justify-between gap-3 rounded-lg border border-purple-500/25 bg-purple-950/10 px-4 py-3 transition-colors hover:border-purple-500/40 ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0 text-purple-400" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-400">Daily Challenge</p>
            <p className="truncate text-sm font-medium text-foreground">
              {preview?.theme ?? "Today's featured source"}
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-purple-400" />
      </Link>
    )
  }

  return (
    <section className={`py-8 px-4 border-t border-border ${className}`}>
      <div className="max-w-2xl mx-auto rounded-xl border border-purple-500/20 bg-purple-950/10 p-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/40 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold tracking-widest uppercase text-purple-400">Daily Challenge</span>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {preview?.theme ?? "Today's Challenge"}
        </h2>
        {preview?.day && (
          <p className="text-xs text-muted-foreground mb-2">Day {preview.day}</p>
        )}
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Play today&apos;s featured source with 5 encrypted modifier cards dealt on-chain.
          Same source, different story — compare scores on the leaderboard.
        </p>
        <Link
          href="/daily"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors"
        >
          Play Today&apos;s Challenge
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  )
}
