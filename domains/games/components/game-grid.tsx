'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Game } from '../types'

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  )
}

function GameCard({ game }: { game: Game }) {
  return (
    <Link 
      href={`/games/${game.slug}`}
      className="block bg-gray-800/50 rounded-lg border border-gray-700 hover:border-purple-600 transition-all duration-200 overflow-hidden group"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <span 
            className="px-2 py-1 text-xs rounded-full border"
            style={{
              borderColor: game.primaryColor || '#8b5cf6',
              color: game.primaryColor || '#8b5cf6',
              backgroundColor: `${game.primaryColor || '#8b5cf6'}20`,
            }}
          >
            {game.genre}
          </span>
          {game.private && (
            <span className="text-xs text-gray-500">Private</span>
          )}
        </div>
        
        <h3 className="text-xl font-semibold mb-2 group-hover:text-purple-400 transition-colors">
          {game.title}
        </h3>
        
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
          {game.description}
        </p>
        
        <blockquote className="text-purple-300 italic text-sm mb-4 border-l-2 border-purple-600 pl-3">
          "{game.tagline}"
        </blockquote>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{game.subgenre}</span>
          <span>{new Date(game.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
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