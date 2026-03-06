'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Game } from '../types'
import { GameCardEnhanced } from './game-card-enhanced'
import { animationConfig } from '@/lib/animations'
import { CardSkeleton } from '@/components/effects'

interface GameGridProps {
  limit?: number
  search?: string
  genre?: string
  writerCoinId?: string
  page?: number
  featured?: boolean
  onLoad?: (data: { total: number, count: number }) => void
}

export function GameGrid({ limit = 25, search, genre, writerCoinId, page = 1, featured, onLoad }: GameGridProps) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Stable ref for onLoad to avoid adding it to deps (parent re-renders would cause
  // infinite fetch loop if onLoad is defined inline at the call site)
  const onLoadRef = useRef(onLoad)
  onLoadRef.current = onLoad

  useEffect(() => {
    async function fetchGames() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (limit) params.set('limit', limit.toString())
        if (page) params.set('offset', ((page - 1) * limit).toString())
        if (search) params.set('search', search)
        if (genre) params.set('genre', genre)
        if (featured) params.set('featured', 'true')
        if (writerCoinId) params.set('writerCoinId', writerCoinId)

        // BUG FIX: was incorrectly calling /api/games/generate (POST creation endpoint)
        // via GET. The listing endpoint is /api/games.
        const response = await fetch(`/api/games?${params}`)
        const result = await response.json()

        if (result.success) {
          setGames(result.data.games)
          // Use ref so onLoad is never in the deps array — prevents infinite loop
          onLoadRef.current?.({ total: result.data.total, count: result.data.games.length })
        } else {
          setError(result.error || 'Failed to load games')
        }
      } catch {
        setError('Failed to load games')
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  // onLoad intentionally omitted — use onLoadRef.current inside instead
   
  }, [limit, search, genre, writerCoinId, page, featured])

  if (loading) {
    // Cap skeletons to avoid huge layout shift — never render more than 6
    const skeletonCount = Math.min(limit, 6)
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-400 py-12">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-purple-400 hover:text-purple-300"
        >
          Try again
        </button>
      </div>
    )
  }

  if (games.length === 0) {
    const emptyMessage = search
      ? `No games matching "${search}".`
      : genre
      ? `No games in the ${genre} genre yet.`
      : 'No games found yet.'
    return (
      <div className="text-center py-16 border border-dashed border-gray-800 rounded-lg">
        <p className="text-gray-500 mb-4">{emptyMessage}</p>
        <Link
          href="/generate"
          className="inline-flex items-center gap-2 text-sm text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-md px-4 py-2 transition-colors"
        >
          Generate the first game
        </Link>
      </div>
    )
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={animationConfig.variants.staggerContainer}
    >
      {games.map((game) => (
        <motion.div
          key={game.id}
          variants={animationConfig.variants.staggerItem}
        >
          <GameCardEnhanced game={game} isUserGame={false} />
        </motion.div>
      ))}
    </motion.div>
  )
}