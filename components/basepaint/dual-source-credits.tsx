'use client'

import { ExternalLink } from 'lucide-react'
import {
  BasePaintFinaleAttribution,
} from '@/components/basepaint/basepaint-finale-attribution'
import { getBasePaintDayUrl } from '@/lib/basepaint'
import {
  parseArticleUrlFromDualSource,
  parseBasePaintDayFromSource,
} from '@/lib/basepaint/source-url'

export interface DualSourceCreditsProps {
  articleUrl?: string | null
  /** Optional display title for the plot source */
  articleTitle?: string | null
  /** Explicit day override (e.g. daily session) */
  basePaintDay?: number | null
  primaryColor?: string
  /** compact = inline credits; full = plot block + BasePaint attribution */
  variant?: 'compact' | 'full'
  className?: string
}

function titleFromArticleUrl(url: string): string {
  try {
    const slug = new URL(url).pathname.split('/').filter(Boolean).pop()
    if (!slug) return 'Featured article'
    return decodeURIComponent(slug).replace(/[-_]/g, ' ')
  } catch {
    return 'Featured article'
  }
}

/**
 * Paired writer + BasePaint credits for dual-source (and BasePaint-only) finales.
 */
export function DualSourceCredits({
  articleUrl,
  articleTitle,
  basePaintDay: dayProp,
  primaryColor = '#a78bfa',
  variant = 'full',
  className = '',
}: DualSourceCreditsProps) {
  const day = dayProp ?? parseBasePaintDayFromSource(articleUrl)
  const dualArticle =
    parseArticleUrlFromDualSource(articleUrl) ||
    (articleUrl && !articleUrl.startsWith('basepaint://') ? articleUrl : null)
  const plotLabel = articleTitle || (dualArticle ? titleFromArticleUrl(dualArticle) : null)

  if (day == null && !dualArticle) return null

  if (variant === 'compact') {
    return (
      <span className={className}>
        {dualArticle && (
          <>
            <a
              href={dualArticle}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {plotLabel || 'featured article'}
            </a>
            {day != null && <span className="text-muted-foreground/70"> · </span>}
          </>
        )}
        {day != null && (
          <a
            href={getBasePaintDayUrl(day)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            BasePaint Day {day}
          </a>
        )}
      </span>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {dualArticle && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-white/50">
            Plot — writer
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {plotLabel || 'Featured article'}
          </p>
          <a
            href={dualArticle}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Read the article <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {day != null && (
        <BasePaintFinaleAttribution
          day={day}
          variant="full"
          primaryColor={primaryColor}
        />
      )}
    </div>
  )
}
