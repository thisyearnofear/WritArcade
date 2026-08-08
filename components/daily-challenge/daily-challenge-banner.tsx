'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, Gamepad2 } from 'lucide-react'
import { getBasePaintDay } from '@/lib/daily-challenge-ui'

interface DailyChallengeBannerProps {
  className?: string
  compact?: boolean
}

interface DailyPreview {
  theme: string
  day: number
  live?: boolean
  sourceType?: string
  articleTitle?: string
  articleAuthor?: string
  canvasTheme?: string
}

async function fetchDailyPreview(): Promise<DailyPreview | null> {
  try {
    const response = await fetch('/api/daily-challenge/start')
    if (response.ok) {
      const data = await response.json()
      const challenge = data.challenge || data.source
      const theme = challenge?.theme || data.source?.theme
      const day = challenge?.day || data.source?.day
      if (theme && day) {
        return {
          theme,
          day,
          live: data.deckShuffled !== false,
          sourceType: challenge?.sourceType || data.source?.sourceType,
          articleTitle: challenge?.articleTitle || data.source?.articleTitle,
          articleAuthor: challenge?.articleAuthor || data.source?.articleAuthor,
          canvasTheme: challenge?.canvasTheme || data.source?.canvasTheme,
        }
      }
    }
  } catch {
    // fall through to BasePaint preview
  }

  try {
    const day = getBasePaintDay()
    const response = await fetch(`/api/daily-challenge/basepaint/${day}`)
    if (!response.ok) return null
    const data = await response.json()
    if (data.theme && data.day) {
      return {
        theme: data.theme,
        day: data.day,
        live: false,
        sourceType: data.sourceType || 'basepaint',
        articleTitle: data.articleTitle,
        articleAuthor: data.articleAuthor,
        canvasTheme: data.canvasTheme,
      }
    }
  } catch {
    return null
  }

  return null
}

function headline(preview: DailyPreview | null, loaded: boolean): string {
  if (!preview) return loaded ? 'The arcade is open' : 'Loading…'
  if (preview.sourceType === 'dual') {
    return preview.articleTitle || preview.theme
  }
  return preview.theme
}

function supportingCopy(preview: DailyPreview | null): string {
  if (!preview) {
    return 'Pick a public game and play in seconds — or paste an article to create your own.'
  }
  if (preview.sourceType === 'dual') {
    return preview.live === false
      ? `A featured writer’s piece staged in today’s BasePaint canvas${preview.canvasTheme ? ` (${preview.canvasTheme})` : ''}. Leaderboard scoring joins when setup finishes.`
      : `A featured writer’s piece inside today’s BasePaint canvas — same world, your secret hand of five encrypted modifiers.`
  }
  return preview.live === false
    ? "Today's BasePaint canvas is ready to preview. Play in the arcade while the Daily Challenge leaderboard finishes setup."
    : "writersarcade Daily Challenge — today's BasePaint canvas, 5 encrypted modifier cards on Base. Same source, different story."
}

export function DailyChallengeBanner({ className = '', compact = false }: DailyChallengeBannerProps) {
  const [preview, setPreview] = useState<DailyPreview | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchDailyPreview()
      .then((data) => setPreview(data))
      .finally(() => setLoaded(true))
  }, [])

  if (compact) {
    return (
      <Link
        href={preview ? '/basepaint' : '/games'}
        className={`flex items-center justify-between gap-3 rounded-lg border border-purple-500/25 bg-purple-950/10 px-4 py-3 transition-colors hover:border-purple-500/40 ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0 text-purple-400" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-400">
              {preview?.live === false ? "Today's theme" : 'Daily Challenge'}
            </p>
            <p className="truncate text-sm font-medium text-foreground">
              {headline(preview, loaded)}
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
          <span className="text-xs font-bold tracking-widest uppercase text-purple-400">
            {preview?.live === false ? "Today's theme" : 'Daily Challenge'}
          </span>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {headline(preview, loaded)}
        </h2>
        {preview?.sourceType === 'dual' && preview.articleAuthor && (
          <p className="text-xs text-muted-foreground mb-1">by {preview.articleAuthor}</p>
        )}
        {preview?.day && (
          <p className="text-xs text-muted-foreground mb-2">
            {preview.sourceType === 'dual'
              ? `World · BasePaint Day ${preview.day}${preview.canvasTheme ? ` · ${preview.canvasTheme}` : ''}`
              : `Day ${preview.day}`}
          </p>
        )}
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          {supportingCopy(preview)}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={preview ? '/basepaint' : '/games'}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors"
          >
            {preview ? 'Open Daily Challenge' : 'Browse the arcade'}
            <ArrowRight className="w-4 h-4" />
          </Link>
          {!preview && loaded && (
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm border border-border text-foreground hover:bg-muted transition-colors"
            >
              <Gamepad2 className="w-4 h-4" />
              Play now
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
