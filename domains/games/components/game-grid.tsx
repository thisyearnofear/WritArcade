'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Game } from '../types'
import { GameCardEnhanced } from './game-card-enhanced'
import { animationConfig } from '@/lib/animations'

interface GameGridProps {
  limit?: number
  search?: string
  genre?: string
}

export function GameGrid({ limit = 25, search, genre }: GameGridProps) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function fetchGames() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (limit) params.set('limit', limit.toString())
        if (search) params.set('search', search)
        if (genre) params.set('genre', genre)
        
        const response = await fetch(`/api/games/generate?${params}`)
        const result = await response.json()
        
        if (result.success) {
          setGames(result.data.games)
        } else {
          setError(result.error || 'Failed to load games')
        }
      } catch (err) {
        setError('Failed to load games')
      } finally {
        setLoading(false)
      }
    }
    
    fetchGames()
  }, [limit, search, genre])
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: limit }).map((_, i) => (
          <GameCardSkeleton key={i} />
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
    return (
      <div className="text-center text-gray-400 py-12">
        <p>No games found.</p>
        <Link href="/generate" className="mt-4 inline-block text-purple-400 hover:text-purple-300">
          Create the first game
        </Link>
      </div>
    )
  }
  
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
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

function GameCardSkeleton() {
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden animate-pulse">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="h-5 w-16 bg-gray-600 rounded-full"></div>
        </div>
        
        <div className="h-6 bg-gray-600 rounded mb-2"></div>
        <div className="h-4 bg-gray-600 rounded mb-1 w-3/4"></div>
        <div className="h-4 bg-gray-600 rounded mb-4 w-1/2"></div>
        
        <div className="h-4 bg-gray-600 rounded mb-4 w-5/6"></div>
        
        <div className="flex items-center justify-between">
          <div className="h-3 bg-gray-600 rounded w-20"></div>
          <div className="h-3 bg-gray-600 rounded w-16"></div>
        </div>
      </div>
    </div>
  )
}