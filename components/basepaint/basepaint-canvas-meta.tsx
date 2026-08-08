'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Film, Image as ImageIcon, Users, Palette, Coins } from 'lucide-react'
import {
  getBasePaintAnimationUrl,
  getBasePaintCanvasProxyUrl,
  getBasePaintDayUrl,
  getBasePaintProfileUrl,
} from '@/lib/basepaint'

export interface BasePaintCanvasMetaProps {
  day: number
  theme: string
  palette?: string[]
  canvasDescription?: string
  /** When false, skip the canvas/timelapse block (hero already shows it). */
  showMedia?: boolean
  stats?: {
    pixelsCount: number
    totalArtists: number
    totalMints: number
    topContributors: Array<{ address: string; pixelsCount: number }>
  }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/** BasePaint canvas preview card — content accents; sits inside writersarcade Daily chrome. */
export function BasePaintCanvasMeta({
  day,
  theme,
  palette,
  canvasDescription,
  showMedia = true,
  stats,
}: BasePaintCanvasMetaProps) {
  const [showTimelapse, setShowTimelapse] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl border border-purple-500/20 bg-purple-950/10">
      {showMedia && (
        <div className="relative aspect-video w-full overflow-hidden">
          {showTimelapse ? (
            <video
              key={day}
              src={getBasePaintAnimationUrl(day)}
              className="h-full w-full object-cover"
              style={{ imageRendering: 'pixelated' }}
              autoPlay
              loop
              muted
              playsInline
              controls
            />
          ) : (
            <img
              src={getBasePaintCanvasProxyUrl(day)}
              alt={theme}
              className="h-full w-full object-cover"
              style={{ imageRendering: 'pixelated' }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-purple-300" aria-hidden />
            <Link
              href={`/basepaint/day/${day}`}
              className="font-mono text-xs text-purple-200 hover:underline"
            >
              BasePaint Day {day}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setShowTimelapse((v) => !v)}
            className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <Film className="h-3.5 w-3.5" aria-hidden />
            {showTimelapse ? 'Final canvas' : 'Timelapse'}
          </button>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-3 gap-px border-b border-purple-500/20 bg-purple-950/30">
          {[
            { icon: Palette, label: 'Pixels', value: formatCount(stats.pixelsCount) },
            { icon: Users, label: 'Artists', value: formatCount(stats.totalArtists) },
            { icon: Coins, label: 'Mints', value: formatCount(stats.totalMints) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-0.5 bg-black/40 px-3 py-3">
              <Icon className="h-3.5 w-3.5 text-purple-300/80" aria-hidden />
              <span className="font-mono text-sm font-bold text-white">{value}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/50">{label}</span>
            </div>
          ))}
        </div>
      )}

      {palette && palette.length > 0 && (
        <div className="flex items-center gap-2 border-b border-white/5 px-6 py-3">
          <span className="text-xs text-muted-foreground">Palette</span>
          <div className="flex gap-1">
            {palette.slice(0, 8).map((color) => (
              <div
                key={color}
                className="h-4 w-4 rounded-sm border border-white/10"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {canvasDescription && (
        <div className="border-b border-white/5 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-300/90">
            What the community painted
          </p>
          <p className="mt-1 text-sm leading-relaxed text-white/75">{canvasDescription}</p>
        </div>
      )}

      {stats && stats.topContributors.length > 0 && (
        <div className="px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-300/90">
            Top contributors
          </p>
          <ul className="mt-2 space-y-1.5">
            {stats.topContributors.map((c) => (
              <li key={c.address} className="flex items-center justify-between text-sm">
                <a
                  href={getBasePaintProfileUrl(c.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-purple-200 hover:underline"
                >
                  {shortenAddress(c.address)}
                </a>
                <span className="text-xs text-muted-foreground">{formatCount(c.pixelsCount)} px</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-white/5 px-6 py-4">
        <a
          href={getBasePaintDayUrl(day)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-purple-200"
        >
          View & mint on BasePaint →
        </a>
        <p className="mt-1 text-[10px] text-white/40">Artwork © BasePaint community (CC0)</p>
      </div>
    </div>
  )
}
