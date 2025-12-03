'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Game } from '../types'
import { Play, Zap, Crown, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GameCardEnhancedProps {
  game: Game
  isUserGame?: boolean
  onMintClick?: () => void
  onRegisterClick?: () => void
  onToggleVisibility?: (isPrivate: boolean) => void
  onDeleteClick?: () => void
  isLoading?: boolean
}

/**
 * Enhanced game card for user's own games with action buttons
 * Single source of truth for game card display across the app
 */
export function GameCardEnhanced({
  game,
  isUserGame = false,
  onMintClick,
  onRegisterClick,
  onToggleVisibility,
  onDeleteClick,
  isLoading = false,
}: GameCardEnhancedProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className="group relative bg-gray-900 border border-gray-800 rounded-lg overflow-hidden"
      whileHover={{ y: -4, border: 'border-purple-500' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Blend layer 1: Multiply blend for depth */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        animate={{
          opacity: isHovered ? 0.1 : 0,
        }}
        transition={{ duration: 0.3 }}
        style={{
          background: `linear-gradient(135deg, ${game.primaryColor || '#8b5cf6'}40, ${game.primaryColor || '#8b5cf6'}10)`,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        }}
      />

      {/* Blend layer 2: Lighten for shimmer */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        animate={{
          opacity: isHovered ? 0.05 : 0,
        }}
        transition={{ duration: 0.3 }}
        style={{
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)`,
          mixBlendMode: 'lighten',
          pointerEvents: 'none',
        }}
      />

      {/* Header with gradient */}
      <motion.div
        className="relative h-24 bg-gradient-to-br"
        animate={{
          opacity: isHovered ? 1 : 0.8,
        }}
        transition={{ duration: 0.3 }}
        style={{
          background: `linear-gradient(135deg, ${game.primaryColor || '#8b5cf6'}40, ${game.primaryColor || '#8b5cf6'}10)`,
          borderBottom: `2px solid ${game.primaryColor || '#8b5cf6'}`,
        }}
      />

      {/* Content */}
      <div className="relative p-6 space-y-3 z-10">
        {/* Genre & Status */}
        <div className="flex items-start justify-between">
          <span
            className="inline-block px-2 py-1 text-xs rounded-full border"
            style={{
              borderColor: game.primaryColor || '#8b5cf6',
              color: game.primaryColor || '#8b5cf6',
              backgroundColor: `${game.primaryColor || '#8b5cf6'}20`,
            }}
          >
            {game.genre}
          </span>
          {isUserGame && (
            <span className={`text-xs px-2 py-1 rounded ${game.private ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
              {game.private ? 'Private' : 'Public'}
            </span>
          )}
        </div>

        {/* Title & Tagline */}
        <div>
          <h3 className="text-lg font-bold text-white mb-1 group-hover:text-purple-400 transition-colors line-clamp-2">
            {game.title}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2 italic">
            {game.tagline}
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 line-clamp-2">
          {game.description}
        </p>

        {/* Meta */}
        <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-800">
          <div className="flex justify-between">
            <span>Created {new Date(game.createdAt).toLocaleDateString()}</span>
            <span className="text-gray-600">{game.subgenre}</span>
          </div>
          <div className="text-gray-600">
            Model: {game.promptModel}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <motion.div
            className="flex-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href={`/games/${game.slug}`}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded font-medium transition-colors relative group/btn"
            >
              {/* Glow effect on button hover */}
              <motion.span
                className="absolute inset-0 rounded opacity-0 group-hover/btn:opacity-50 transition-opacity"
                style={{
                  background: `radial-gradient(circle, ${game.primaryColor || '#a855f7'}40, transparent)`,
                  filter: 'blur(8px)',
                  pointerEvents: 'none',
                }}
              />
              <span className="relative flex items-center gap-2">
                <Play className="w-4 h-4" />
                Play
              </span>
            </Link>
          </motion.div>

          {isUserGame && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onMintClick}
                disabled={isLoading}
                className="flex items-center gap-2"
                title="Mint as NFT on Base"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Mint</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onRegisterClick}
                disabled={isLoading}
                className="flex items-center gap-2"
                title="Register as IP on Story Protocol"
              >
                <Crown className="w-4 h-4" />
                <span className="hidden sm:inline">Register</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleVisibility?.(!game.private)}
                disabled={isLoading}
                className="flex items-center gap-2"
                title={game.private ? 'Make public' : 'Make private'}
              >
                {game.private ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onDeleteClick}
                disabled={isLoading}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:border-red-400"
                title="Delete game"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
