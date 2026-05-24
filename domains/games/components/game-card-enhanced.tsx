'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Game } from '../types'
import { Play, Zap, Crown, Trash2, Eye, EyeOff, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAccount } from 'wagmi'
import { isAdmin } from '@/lib/constants'
import { HypercertBadge } from './hypercert-badge'

interface GameCardEnhancedProps {
  game: Game
  isUserGame?: boolean
  onMintClick?: () => void
  onRegisterClick?: () => void
  onToggleVisibility?: (isPrivate: boolean) => void
  onSettingsClick?: () => void
  onDeleteClick?: () => void
  isLoading?: boolean
}

/**
 * Enhanced game card with consistent, lightweight micro-interactions
 * Single source of truth for game card display across the app
 */
export function GameCardEnhanced({
  game,
  isUserGame = false,
  onMintClick,
  onRegisterClick,
  onToggleVisibility,
  onSettingsClick,
  onDeleteClick,
  isLoading = false,
}: GameCardEnhancedProps) {
  const { address } = useAccount()
  const userIsAdmin = isAdmin(address)

  // Settings visible if owner OR admin
  const showSettings = isUserGame || userIsAdmin

  // Card animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1] as const,
      }
    },
  }

  return (
    <motion.div
      className="group relative"
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="relative overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-all duration-200 group-hover:border-border group-hover:shadow-md dark:bg-card">
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, ${game.primaryColor || '#8b5cf6'}, ${game.primaryColor || '#8b5cf6'}55)`,
          }}
        />

        {/* Content */}
        <div className="relative space-y-3 p-5 sm:p-6">
          {/* Genre & Status */}
          <div className="flex items-start justify-between">
            <motion.span
              className="inline-block rounded-full border px-2 py-1 text-xs font-medium"
              style={{
                borderColor: game.primaryColor || '#8b5cf6',
                color: game.primaryColor || '#8b5cf6',
                backgroundColor: `${game.primaryColor || '#8b5cf6'}20`,
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              {game.genre}
            </motion.span>
            {isUserGame && (
              <div className="flex items-center gap-2">
                <motion.span 
                  className={`rounded px-2 py-1 text-xs ${game.private ? 'bg-red-500/20 text-red-700 dark:text-red-400' : 'bg-green-500/20 text-green-700 dark:text-green-400'}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                >
                  {game.private ? 'Private' : 'Public'}
                </motion.span>
                {game.nftTokenId && (
                  <motion.span 
                    className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
                  >
                    Minted
                  </motion.span>
                )}
              </div>
            )}
          </div>

          {/* Title & Tagline with responsive sizing */}
          <div>
            <motion.h3 
              className="mb-1 line-clamp-2 text-base font-bold text-foreground transition-colors group-hover:text-muted-foreground sm:text-lg"
              layout
            >
              {game.title}
            </motion.h3>
            <p className="line-clamp-2 text-xs uppercase italic text-muted-foreground sm:text-sm">
              {game.tagline}
            </p>
          </div>

          {/* Description with responsive sizing */}
          <p className="line-clamp-3 text-xs text-muted-foreground sm:text-sm">
            {game.description}
          </p>

          {/* Meta */}
          <div className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Created {new Date(game.createdAt).toLocaleDateString()}</span>
              <span className="text-muted-foreground">{game.subgenre}</span>
            </div>
            <div className="text-muted-foreground">
              Model: {game.promptModel}
            </div>
            {game.hypercertUri && (
              <HypercertBadge hypercertUri={game.hypercertUri} compact />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <motion.div className="flex-1" whileTap={{ scale: 0.98 }}>
              <Link
                href={`/games/${game.slug}`}
                className="flex h-9 items-center justify-center gap-2 rounded-md border border-foreground bg-foreground px-3 text-sm font-medium text-background transition-all duration-200 hover:bg-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] dark:border-white/15 dark:bg-white dark:text-card dark:hover:bg-border dark:focus-visible:ring-muted-foreground dark:focus-visible:ring-offset-card"
              >
                <span className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  {game.playFee ? (
                    <span className="flex items-center gap-1">
                      Play
                      <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold dark:bg-background/15">
                        {game.playFee} $DONUT
                      </span>
                    </span>
                  ) : (
                    'Play'
                  )}
                </span>
              </Link>
            </motion.div>

            {isUserGame && (
              <>
                <ActionButton
                  onClick={onMintClick}
                  disabled={isLoading}
                  icon={<Zap className="w-4 h-4" />}
                  label="Mint"
                  title="Mint as NFT on Base"
                />

                <ActionButton
                  onClick={onRegisterClick}
                  disabled={isLoading}
                  icon={<Crown className="w-4 h-4" />}
                  label="Register"
                  title="Register as IP on Story Protocol"
                />

                <ActionButton
                  onClick={() => onToggleVisibility?.(!game.private)}
                  disabled={isLoading}
                  icon={game.private ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  label={game.private ? 'Make Public' : 'Make Private'}
                  title={game.private ? 'Make public' : 'Make private'}
                  ariaLabel={game.private ? 'Make public' : 'Make private'}
                />
              </>
            )}

            {/* Settings Button Separated to be visible for Admins too */}
            {showSettings && (
              <ActionButton
                onClick={onSettingsClick}
                disabled={isLoading}
                icon={<Settings className={`w-4 h-4 ${userIsAdmin && !isUserGame ? 'text-yellow-500' : ''}`} />}
                label=""
                title="Configure Settings (Fee & Visibility & Featured)"
              />
            )}

            {/* Delete for Owner Only */}
            {isUserGame && (
              <ActionButton
                onClick={onDeleteClick}
                disabled={isLoading}
                icon={<Trash2 className="w-4 h-4" />}
                label=""
                title="Delete game"
                variant="danger"
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Helper component for action buttons with consistent animations
interface ActionButtonProps {
  onClick?: () => void
  disabled?: boolean
  icon: React.ReactNode
  label: string
  title: string
  ariaLabel?: string
  variant?: 'default' | 'danger'
}

function ActionButton({ onClick, disabled, icon, label, title, ariaLabel, variant = 'default' }: ActionButtonProps) {
  const baseClasses = "flex items-center gap-2 border-border text-foreground transition-all duration-200 hover:border-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] dark:hover:bg-muted dark:focus-visible:ring-muted-foreground dark:focus-visible:ring-offset-card"
  const variantClasses = variant === 'danger' 
    ? "text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-700/70 dark:hover:bg-red-500/10 dark:hover:text-red-400"
    : ""

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${variantClasses}`}
        title={title}
        aria-label={ariaLabel || title}
      >
        {icon}
        {label && <span className="hidden sm:inline">{label}</span>}
      </Button>
    </motion.div>
  )
}
