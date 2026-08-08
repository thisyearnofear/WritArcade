'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Palette, Users } from 'lucide-react'
import { getBasePaintDayUrl, getBasePaintProfileUrl } from '@/lib/basepaint'
import { parseBasePaintDayFromSource } from '@/lib/basepaint/source-url'

interface Contributor {
  address: string
  pixelsCount: number
}

interface DayPreview {
  day: number
  theme: string
  stats?: {
    totalArtists: number
    totalMints: number
    topContributors: Contributor[]
  }
}

export interface BasePaintFinaleAttributionProps {
  day: number
  /** full = contributors + mint; compact = one line + mint; mint-only = CTA button only */
  variant?: 'full' | 'compact' | 'mint-only'
  primaryColor?: string
  className?: string
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function formatContributorLine(contributors: Contributor[], totalArtists: number): string {
  if (contributors.length === 0) {
    return `${totalArtists} artists painted today's canvas`
  }
  const names = contributors.slice(0, 3).map((c) => shortenAddress(c.address))
  const others = Math.max(0, totalArtists - contributors.length)
  if (others <= 0) {
    return `Story inspired by pixels from ${names.join(', ')}`
  }
  return `Story inspired by pixels from ${names.join(', ')} and ${others} others`
}

export function BasePaintFinaleAttribution({
  day,
  variant = 'full',
  primaryColor = '#a78bfa',
  className = '',
}: BasePaintFinaleAttributionProps) {
  const [preview, setPreview] = useState<DayPreview | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/daily-challenge/basepaint/${day}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setPreview({
            day: data.day,
            theme: data.theme,
            stats: data.stats,
          })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [day])

  const theme = preview?.theme ?? `Day ${day}`
  const contributors = preview?.stats?.topContributors ?? []
  const totalArtists = preview?.stats?.totalArtists ?? 0
  const mintUrl = getBasePaintDayUrl(day)

  const mintButton = (
    <a
      href={mintUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
      style={{ backgroundColor: primaryColor }}
    >
      Mint this canvas on BasePaint
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  )

  if (variant === 'mint-only') {
    return <div className={className}>{mintButton}</div>
  }

  return (
    <div
      className={`space-y-4 rounded-xl border border-purple-500/30 bg-purple-950/20 p-5 ${className}`}
    >
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-300">
          World — BasePaint Day {day}
        </p>
        <p className="text-sm font-semibold text-foreground">{theme}</p>
        {variant === 'full' && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {formatContributorLine(contributors, totalArtists)}
          </p>
        )}
      </div>

      {variant === 'full' && preview?.stats && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {preview.stats.totalArtists.toLocaleString()} artists
          </span>
          <span className="inline-flex items-center gap-1">
            <Palette className="h-3.5 w-3.5" />
            {preview.stats.totalMints.toLocaleString()} mints
          </span>
        </div>
      )}

      {variant === 'full' && contributors.length > 0 && (
        <details className="border-t border-white/10 pt-3">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Top painters
          </summary>
          <ul className="mt-2 space-y-1.5">
            {contributors.slice(0, 3).map((c) => (
              <li key={c.address} className="flex items-center justify-between text-xs">
                <a
                  href={getBasePaintProfileUrl(c.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-purple-200 hover:underline"
                >
                  {shortenAddress(c.address)}
                </a>
                <span className="text-muted-foreground">{c.pixelsCount.toLocaleString()} px</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        {mintButton}
        <Link
          href={`/basepaint/day/${day}`}
          className="text-center text-xs text-muted-foreground hover:text-foreground sm:text-right"
        >
          View day archive →
        </Link>
      </div>

      <p className="text-[10px] text-muted-foreground/70">Artwork © BasePaint community (CC0)</p>
    </div>
  )
}

/** Resolve BasePaint day from game source URL or active daily session. */
export function resolveBasePaintDay(
  articleUrl?: string | null,
  dailySessionDay?: number | null
): number | null {
  const fromUrl = parseBasePaintDayFromSource(articleUrl)
  if (fromUrl != null) return fromUrl
  if (dailySessionDay != null && dailySessionDay > 0) return dailySessionDay
  return null
}
