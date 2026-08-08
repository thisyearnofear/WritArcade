'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { useIsActive } from '@/hooks/useIsActive'

const LINKS = [
  { href: '/basepaint', label: 'Today', title: "Today's Daily Challenge" },
  { href: '/basepaint/collection', label: 'Collection', title: 'Your BasePaint canvases' },
] as const

/** Thin secondary nav under the main writersarcade header on Daily Challenge routes. */
export function DailyChallengeSubnav() {
  const isActive = useIsActive()

  return (
    <div className="border-b border-border bg-muted/30">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="mr-2 shrink-0 text-[10px] font-bold uppercase tracking-wider text-purple-400">
            Daily Challenge
          </span>
          {LINKS.map(({ href, label, title }) => (
            <Link
              key={href}
              href={href}
              title={title}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                isActive(href)
                  ? 'bg-purple-500/20 text-purple-200'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              aria-current={isActive(href) ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </div>
        <a
          href="https://basepaint.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Source: BasePaint
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>
    </div>
  )
}
