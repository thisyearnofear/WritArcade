'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Gamepad2, Sparkles, Trophy, BarChart3, ExternalLink } from 'lucide-react'
import type { Game, ChatMessage } from '../types'
import { ShareDropdown } from '@/components/ui/share-dropdown'

interface PostGameCompletionProps {
  game: Game
  messages: ChatMessage[]
  userChoices: Array<{ panelIndex: number; choice: string; timestamp: string }>
}

export function PostGameCompletion({ game, messages, userChoices }: PostGameCompletionProps) {
  const [playCount, setPlayCount] = useState<number | null>(null)

  // Fetch play count for social proof
  useEffect(() => {
    fetch('/api/games/stats')
      .then(r => r.json())
      .then(d => {
        if (d.success) setPlayCount(d.data.publicGames)
      })
      .catch(() => {})
  }, [])

  const panelCount = messages.filter(m => m.role === 'assistant').length
  const totalChoices = userChoices.length

  const gameUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/games/${game.slug}`
    : `/games/${game.slug}`

  const lastChoice = userChoices[userChoices.length - 1]?.choice
  const truncatedChoice = lastChoice && lastChoice.length > 80 ? `${lastChoice.slice(0, 80)}…` : lastChoice
  const endingText = truncatedChoice
    ? `My story ended with: ${truncatedChoice}`
    : `I just finished "${game.title}" on WritersArcade`

  const shareData = useMemo(
    () => ({
      title: game.title,
      text: endingText,
      url: gameUrl,
      genre: game.genre,
      panelCount,
      gameTitle: game.title,
      author: game.authorParagraphUsername || undefined,
    }),
    [game.title, game.genre, game.authorParagraphUsername, endingText, gameUrl, panelCount]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-2xl mx-auto px-4 pb-16"
    >
      {/* Celebration header */}
      <div className="text-center space-y-4 mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25"
        >
          <Trophy className="w-8 h-8 text-white" />
        </motion.div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Story Complete
          </h2>
          <p className="text-muted-foreground text-sm">
            You finished &ldquo;{game.title}&rdquo; — a {game.genre} journey through {panelCount} panels
          </p>
        </div>
      </div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="grid grid-cols-3 gap-3 mb-8"
      >
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center">
          <BarChart3 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{panelCount}</p>
          <p className="text-xs text-muted-foreground">Panels played</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center">
          <Gamepad2 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{totalChoices}</p>
          <p className="text-xs text-muted-foreground">Choices made</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center">
          <Sparkles className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">
            {playCount !== null ? `${playCount}` : '—'}
          </p>
          <p className="text-xs text-muted-foreground">Games created</p>
        </div>
      </motion.div>

      {/* Viral share card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-5 mb-8"
      >
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-1">Share your ending</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {endingText}
            </p>
          </div>
          <ShareDropdown
            data={shareData}
            surface="post_game_completion"
            variant="default"
            size="default"
            buttonClassName="shrink-0 bg-white text-black hover:bg-white/90"
          />
        </div>
      </motion.div>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="space-y-3"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/generate"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3.5 text-sm font-bold text-white hover:from-purple-500 hover:to-pink-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            Make your own game
          </Link>
          <Link
            href="/my-games"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/5 px-5 py-3.5 text-sm font-bold text-purple-200 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all"
          >
            <Gamepad2 className="w-4 h-4" />
            My games
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {game.authorParagraphUsername && (
            <Link
              href={`/writers/${game.writerCoinId || ''}`}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              More from @{game.authorParagraphUsername}
            </Link>
          )}
          <Link
            href="/games"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
          >
            <Gamepad2 className="w-4 h-4" />
            Play another
          </Link>
        </div>
      </motion.div>

      {/* Article context */}
      {game.articleUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-6 text-center"
        >
          <a
            href={game.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Read the original article <ExternalLink className="w-3 h-3" />
          </a>
        </motion.div>
      )}
    </motion.div>
  )
}
