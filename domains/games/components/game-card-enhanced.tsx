'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Game } from '../types'
import { Play, Zap, Crown, Trash2, Eye, EyeOff, Settings, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAccount } from 'wagmi'
import { isAdmin } from '@/lib/constants'
import { HypercertBadge } from './hypercert-badge'
import { ProtocolLifecycle } from './protocol-lifecycle'
import { trackEvent } from '@/services/analytics'

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
  const writerMintReceipt = game.nftTokenId ? game.writerMintReceipt : undefined

  // Settings visible if owner OR admin
  const showSettings = isUserGame || userIsAdmin
  const handleShare = async () => {
    trackEvent('share_clicked', {
      surface: 'game_card',
      gameSlug: game.slug,
    })
    const url = `${window.location.origin}/games/${game.slug}`
    if (navigator.share) {
      await navigator.share({
        title: game.title,
        text: game.description,
        url,
      }).catch(() => {})
      return
    }
    await navigator.clipboard.writeText(url)
  }

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
            <ProtocolLifecycle game={game} variant="compact" />
            {writerMintReceipt && (
              <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-800 dark:text-emerald-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Writer receipt
                </div>
                <div className="mt-1 leading-snug">
                  {writerMintReceipt.writerShare} routed to {writerMintReceipt.writer} on this mint.
                </div>
              </div>
            )}
            {game.hypercertUri && (
              <HypercertBadge hypercertUri={game.hypercertUri} compact />
            )}
          </div>

          {/* Primary action */}
          <div className="space-y-3 pt-4">
            <motion.div whileTap={{ scale: 0.98 }}>
              <Link
                href={`/games/${game.slug}`}
                onClick={() => trackEvent('play_clicked', {
                  surface: isUserGame ? 'my_games_card' : 'game_card',
                  gameSlug: game.slug,
                  mode: game.mode || 'story',
                })}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-foreground bg-foreground px-3 text-sm font-semibold text-background transition-all duration-200 hover:bg-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] dark:border-white/15 dark:bg-white dark:text-card dark:hover:bg-border dark:focus-visible:ring-muted-foreground dark:focus-visible:ring-offset-card"
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
              <div className="rounded-lg border border-border bg-muted/30 p-2">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Ownership
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton
                    onClick={() => {
                      trackEvent('ownership_clicked', {
                        action: 'mint',
                        surface: 'my_games_card',
                        gameSlug: game.slug,
                      })
                      onMintClick?.()
                    }}
                    disabled={isLoading || !!game.nftTokenId}
                    icon={<Zap className="w-4 h-4" />}
                    label={game.nftTokenId ? 'Minted' : 'Mint NFT'}
                    title={game.nftTokenId ? 'Already minted as NFT' : 'Mint as NFT'}
                  />

                  <ActionButton
                    onClick={() => {
                      trackEvent('ownership_clicked', {
                        action: 'register_ip',
                        surface: 'my_games_card',
                        gameSlug: game.slug,
                      })
                      onRegisterClick?.()
                    }}
                    disabled={isLoading || !!game.storyIpId}
                    icon={<Crown className="w-4 h-4" />}
                    label={game.storyIpId ? 'IP Registered' : 'Register IP'}
                    title={game.storyIpId ? 'Already registered as IP' : 'Register as IP on Story Protocol'}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <ActionButton
                onClick={handleShare}
                disabled={isLoading}
                icon={<Share2 className="w-4 h-4" />}
                label="Share"
                title="Share game"
              />

              {isUserGame && (
                <ActionButton
                  onClick={() => onToggleVisibility?.(!game.private)}
                  disabled={isLoading}
                  icon={game.private ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  label={game.private ? 'Public' : 'Private'}
                  title={game.private ? 'Make public' : 'Make private'}
                  ariaLabel={game.private ? 'Make public' : 'Make private'}
                />
              )}

              {/* Settings Button Separated to be visible for Admins too */}
              {showSettings && (
                <ActionButton
                  onClick={onSettingsClick}
                  disabled={isLoading}
                  icon={<Settings className={`w-4 h-4 ${userIsAdmin && !isUserGame ? 'text-yellow-500' : ''}`} />}
                  label="Settings"
                  title="Configure settings"
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
  const baseClasses = "w-full justify-center flex items-center gap-2 border-border text-foreground transition-all duration-200 hover:border-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] dark:hover:bg-muted dark:focus-visible:ring-muted-foreground dark:focus-visible:ring-offset-card"
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
        {label && <span>{label}</span>}
      </Button>
    </motion.div>
  )
}
