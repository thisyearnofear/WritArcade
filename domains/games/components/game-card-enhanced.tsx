'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Game } from '../types'
import {
  Play,
  Zap,
  Crown,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Share2,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAccount } from 'wagmi'
import { isAdmin } from '@/lib/constants'
import { HypercertBadge } from './hypercert-badge'
import { GameOwnershipProgress } from './game-ownership-progress'
import { getGameProgress } from '@/lib/game-progress'
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
  const showSettings = isUserGame || userIsAdmin
  const progress = getGameProgress(game)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [ownershipOpen, setOwnershipOpen] = useState(false)

  const handleShare = async () => {
    trackEvent('share_clicked', { surface: 'game_card', gameSlug: game.slug })
    const url = `${window.location.origin}/games/${game.slug}`
    if (navigator.share) {
      await navigator.share({ title: game.title, text: game.tagline, url }).catch(() => {})
      return
    }
    await navigator.clipboard.writeText(url)
  }

  return (
    <motion.div
      className="group relative"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all group-hover:shadow-md">
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, ${game.primaryColor || '#8b5cf6'}, ${game.primaryColor || '#8b5cf6'}55)`,
          }}
        />

        <div className="space-y-3 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <span
              className="inline-block rounded-full border px-2 py-1 text-xs font-medium"
              style={{
                borderColor: game.primaryColor || '#8b5cf6',
                color: game.primaryColor || '#8b5cf6',
                backgroundColor: `${game.primaryColor || '#8b5cf6'}20`,
              }}
            >
              {game.genre}
            </span>
            {isUserGame && (
              <span
                className={`shrink-0 rounded px-2 py-1 text-xs ${
                  game.private
                    ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                    : 'bg-green-500/20 text-green-700 dark:text-green-400'
                }`}
              >
                {game.private ? 'Private' : 'Public'}
              </span>
            )}
          </div>

          <div>
            <h3 className="mb-1 line-clamp-2 text-base font-bold text-foreground sm:text-lg">{game.title}</h3>
            <p className="line-clamp-2 text-sm italic text-muted-foreground">{game.tagline}</p>
          </div>

          {isUserGame && (
            <GameOwnershipProgress game={game} variant="compact" />
          )}

          {!isUserGame && progress.chipLabel && (
            <p className="text-xs text-muted-foreground">{progress.chipLabel}</p>
          )}

          <div className="border-t border-border pt-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Created {new Date(game.createdAt).toLocaleDateString()}</span>
              <span>{game.subgenre}</span>
            </div>
            {game.hypercertUri && (
              <div className="mt-2">
                <HypercertBadge hypercertUri={game.hypercertUri} compact />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAboutOpen(!aboutOpen)}
            className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground"
          >
            About this game
            {aboutOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {aboutOpen && (
            <p className="text-xs leading-relaxed text-muted-foreground">{game.description}</p>
          )}

          <div className="space-y-2 pt-1">
            <Link
              href={`/games/${game.slug}`}
              onClick={() =>
                trackEvent('play_clicked', {
                  surface: isUserGame ? 'my_games_card' : 'game_card',
                  gameSlug: game.slug,
                  mode: game.mode || 'story',
                })
              }
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-foreground px-3 text-sm font-semibold text-background transition-colors hover:opacity-90"
            >
              <Play className="h-4 w-4" />
              {game.playFee ? `Play · ${game.playFee} $DONUT` : 'Play'}
            </Link>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleShare} disabled={isLoading}>
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
              {isUserGame && (
                <Link
                  href={`/games/${game.slug}/insights`}
                  className="inline-flex flex-1 h-9 items-center justify-center gap-1 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <BarChart3 className="h-4 w-4" />
                  Insights
                </Link>
              )}
            </div>

            {isUserGame && (
              <>
                <button
                  type="button"
                  onClick={() => setOwnershipOpen(!ownershipOpen)}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Ownership
                  {ownershipOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {ownershipOpen && (
                  <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-2">
                    {progress.nextStepLabel && (
                      <p className="px-1 text-xs text-purple-600 dark:text-purple-400">{progress.nextStepLabel}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <ActionButton
                        onClick={() => {
                          trackEvent('ownership_clicked', { action: 'mint', surface: 'my_games_card', gameSlug: game.slug })
                          onMintClick?.()
                        }}
                        disabled={isLoading || !!game.nftTokenId}
                        icon={<Zap className="w-4 h-4" />}
                        label={game.nftTokenId ? 'Minted' : 'Mint NFT'}
                      />
                      <ActionButton
                        onClick={() => {
                          trackEvent('ownership_clicked', { action: 'register_ip', surface: 'my_games_card', gameSlug: game.slug })
                          onRegisterClick?.()
                        }}
                        disabled={isLoading || !!game.storyIpId}
                        icon={<Crown className="w-4 h-4" />}
                        label={game.storyIpId ? 'IP Registered' : 'Register IP'}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        onClick={() => onToggleVisibility?.(!game.private)}
                        disabled={isLoading}
                        icon={game.private ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        label={game.private ? 'Make public' : 'Make private'}
                      />
                      {showSettings && (
                        <ActionButton
                          onClick={onSettingsClick}
                          disabled={isLoading}
                          icon={<Settings className="w-4 h-4" />}
                          label="Settings"
                        />
                      )}
                      <ActionButton
                        onClick={onDeleteClick}
                        disabled={isLoading}
                        icon={<Trash2 className="w-4 h-4" />}
                        label="Delete"
                        variant="danger"
                      />
                    </div>
                    {writerMintReceipt && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 px-1">
                        {writerMintReceipt.writerShare} to {writerMintReceipt.writer} on mint
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ActionButton({
  onClick,
  disabled,
  icon,
  label,
  variant = 'default',
}: {
  onClick?: () => void
  disabled?: boolean
  icon: React.ReactNode
  label: string
  variant?: 'default' | 'danger'
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`w-full justify-center gap-1.5 text-xs ${
        variant === 'danger' ? 'text-red-500 hover:text-red-600 hover:border-red-300' : ''
      }`}
    >
      {icon}
      {label}
    </Button>
  )
}
