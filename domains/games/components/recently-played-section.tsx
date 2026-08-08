'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, ChevronRight } from 'lucide-react'
import { useRecentlyPlayed } from '@/hooks/use-recently-played'
import { GameCard } from '@/components/ui/game-card'
import { getWriterCoinById, MUSD_CONFIG } from '@/lib/writer-coins'
import type { Game } from '@/domains/games/types'

function getGameSymbol(game: Game): string {
  if (!game.writerCoinId) return 'WRITER COIN'
  if (game.writerCoinId === 'musd-testnet') return MUSD_CONFIG.testnet.symbol
  if (game.writerCoinId === 'musd-mainnet') return MUSD_CONFIG.mainnet.symbol
  return getWriterCoinById(game.writerCoinId)?.symbol || game.writerCoinId.toUpperCase()
}

/**
 * Homepage section showing games the user has recently played.
 * Reads slugs from localStorage (via useRecentlyPlayed), fetches the
 * matching public games, and renders them as a horizontal scroll of
 * GameCards with a "Continue" CTA.
 *
 * Renders nothing if the user has no recently-played history —
 * the section simply disappears, keeping the homepage clean for
 * first-time visitors.
 */
export function RecentlyPlayedSection() {
  const { entries } = useRecentlyPlayed()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (entries.length === 0) {
      setGames([])
      return
    }

    let cancelled = false
    setLoading(true)

    async function fetchGames() {
      try {
        const slugs = entries.map((e) => e.slug).join(',')
        const res = await fetch(`/api/games/by-slugs?slugs=${encodeURIComponent(slugs)}`)
        const result = await res.json()
        if (!cancelled && result.success) {
          setGames(result.data as Game[])
        }
      } catch {
        // Non-critical — section just won't render
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchGames()
    return () => { cancelled = true }
  }, [entries])

  // Don't render the section at all if there's nothing to show
  if (entries.length === 0 || (games.length === 0 && !loading)) {
    return null
  }

  return (
    <section className="py-16 px-4 border-b border-border" aria-labelledby="continue-playing-heading">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 id="continue-playing-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            Continue playing
          </h2>
          <Link href="/games" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Browse all
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: Math.min(entries.length, 3) }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {games.slice(0, 6).map((game) => (
              <GameCard
                key={game.slug}
                slug={game.slug}
                title={game.title}
                description={game.description}
                genre={game.genre}
                imageUrl={game.imageUrl}
                primaryColor={game.primaryColor}
                symbol={getGameSymbol(game)}
                playCount={game.playCount}
                lastPlayedAt={game.lastPlayedAt ? new Date(game.lastPlayedAt).toISOString() : null}
                hasAnimation={game.videoUpsellStatus === 'completed'}
              />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}
