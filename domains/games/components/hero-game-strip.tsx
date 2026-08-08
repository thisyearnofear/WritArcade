'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export interface SampleGame {
  slug: string
  title: string
  imageUrl?: string
}

/** Below this we render nothing — a two-tile "strip" reads as a bug, not proof. */
const MIN_TILES = 3
const MAX_TILES = 5

/** Slight alternating tilt so the row reads as a comic strip rather than a logo bar. */
const TILT = [-3, 1.5, -1, 2.5, -2]

/**
 * Proof-of-product strip for the hero.
 *
 * Presentational: the homepage owns the fetch so the same games also back the
 * primary CTA, and one request serves both. Silent when under-populated, per the
 * empty-state policy on the homepage sections.
 */
export function HeroGameStrip({ games }: { games: SampleGame[] }) {
  if (games.length < MIN_TILES) return null

  return (
    <motion.div
      className="mt-8 flex flex-col items-center gap-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
    >
      <ul className="flex items-center justify-center gap-2 sm:gap-3">
        {games.slice(0, MAX_TILES).map((game, index) => (
          <li key={game.slug}>
            <Link
              href={`/games/${game.slug}`}
              title={game.title}
              className="group block overflow-hidden rounded-lg border border-border bg-muted shadow-sm transition-all hover:z-10 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              style={{ transform: `rotate(${TILT[index % TILT.length]}deg)` }}
            >
              {/* Plain img matches GameCard: remote covers aren't in next/image domains. */}
              <img
                src={game.imageUrl}
                alt=""
                loading="lazy"
                className="h-16 w-16 object-cover transition-transform duration-500 group-hover:scale-105 sm:h-20 sm:w-20"
              />
              <span className="sr-only">{game.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">Real games, generated from real articles</p>
    </motion.div>
  )
}
