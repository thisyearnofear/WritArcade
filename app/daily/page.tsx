'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Users,
  Sparkles,
  ArrowRight,
  Image as ImageIcon,
  Loader2,
  Wallet,
  Gamepad2,
  Eye,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useDailyChallengeOnchain } from '@/hooks/use-daily-challenge-onchain'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { ArcadeFunnelCTAs } from '@/components/daily-challenge/arcade-funnel-ctas'
import { DailyStatusBanner, type DailyStatusVariant } from '@/components/daily-challenge/daily-status-banner'
import { getBasePaintDay } from '@/lib/daily-challenge-ui'
import { getBasePaintCanvasProxyUrl } from '@/lib/daily-challenge'

interface DailyChallengeData {
  day: number
  sourceType: string
  theme: string
  palette?: string[]
  canvasUrl?: string
  promptText?: string
}

interface LeaderboardEntry {
  playerAddress: string
  score: number
  gameTitle?: string
  gameSlug?: string
}

type DailyMode = 'live' | 'preview' | 'unavailable'

async function fetchBasePaintPreview(day: number): Promise<DailyChallengeData | null> {
  try {
    const response = await fetch(`/api/daily-challenge/basepaint/${day}`)
    if (!response.ok) return null
    const data = await response.json()
    return {
      day: data.day,
      sourceType: 'basepaint',
      theme: data.theme,
      palette: data.palette,
      canvasUrl: data.canvasUrl,
      promptText: data.promptText,
    }
  } catch {
    return null
  }
}

export default function DailyChallengePage() {
  const [challenge, setChallenge] = useState<DailyChallengeData | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [dailyMode, setDailyMode] = useState<DailyMode>('unavailable')
  const [loading, setLoading] = useState(true)
  const [playError, setPlayError] = useState<DailyStatusVariant | null>(null)

  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { beginSession, isStarting, isSwitchingChain, state: onChainState } = useDailyChallengeOnchain()

  const loadChallenge = useCallback(async () => {
    setLoading(true)
    setPlayError(null)

    let nextChallenge: DailyChallengeData | null = null
    let nextLeaderboard: LeaderboardEntry[] = []
    let nextMode: DailyMode = 'unavailable'

    try {
      const response = await fetch('/api/daily-challenge/start')
      if (response.ok) {
        const data = await response.json()
        nextChallenge = data.challenge || data.source || null
        nextLeaderboard = data.leaderboard || []
        nextMode = data.deckShuffled !== false ? 'live' : 'preview'
      } else {
        nextMode = 'preview'
      }
    } catch {
      nextMode = 'preview'
    }

    if (!nextChallenge) {
      const preview = await fetchBasePaintPreview(getBasePaintDay())
      if (preview) {
        nextChallenge = preview
        nextMode = 'preview'
      } else {
        nextMode = 'unavailable'
      }
    }

    setChallenge(nextChallenge)
    setLeaderboard(nextLeaderboard)
    setDailyMode(nextMode)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadChallenge()
  }, [loadChallenge])

  const handlePlay = useCallback(async () => {
    setPlayError(null)

    if (dailyMode !== 'live') return

    if (!isConnected) {
      openConnectModal?.()
      return
    }

    try {
      if (!onChainState?.incoSessionId) {
        await beginSession()
      }

      if (challenge?.sourceType === 'basepaint') {
        window.location.href = `/generate?source=basepaint&day=${challenge.day}&daily=1`
      } else {
        window.location.href = '/generate?source=daily&daily=1'
      }
    } catch {
      setPlayError('play-error')
    }
  }, [beginSession, challenge, dailyMode, isConnected, onChainState?.incoSessionId, openConnectModal])

  const isPlayBusy = isStarting || isSwitchingChain
  const showStatusBanner = dailyMode === 'preview' || playError === 'play-error'
  const statusVariant: DailyStatusVariant =
    playError === 'play-error' ? 'play-error' : 'deck-warming'

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex min-h-screen flex-col">
        <Header />

        <main
          id="main-content"
          className="flex-1 bg-gradient-to-b from-purple-950/20 via-black to-black text-white"
        >
          {loading ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full" />
            </div>
          ) : !challenge ? (
            <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Daily challenge is taking a breather</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We couldn&apos;t load today&apos;s theme right now — but the arcade is open. Pick a public game
                  and play in seconds, no wallet needed.
                </p>
              </div>
              <ArcadeFunnelCTAs layout="stack" />
              <button
                type="button"
                onClick={loadChallenge}
                className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try loading again
              </button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/40">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-bold tracking-widest uppercase text-purple-400">
                    {dailyMode === 'live' ? 'Daily Challenge' : 'Today\'s Theme'}
                  </span>
                </div>
                <h1 className="text-4xl font-bold">{challenge.theme}</h1>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  {dailyMode === 'live'
                    ? 'Preview today\'s source free — no wallet required. Connect on Base when you\'re ready to draw your encrypted modifier hand.'
                    : 'Today\'s BasePaint theme is live. Play something in the arcade now — leaderboard scoring joins when setup finishes.'}
                </p>
              </div>

              {showStatusBanner && (
                <DailyStatusBanner variant={statusVariant} />
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 px-5 py-4"
              >
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-left">
                    <p className="text-sm font-semibold text-emerald-100">Today&apos;s source preview</p>
                    <p className="text-xs text-emerald-100/75 leading-relaxed">
                      {challenge.sourceType === 'basepaint'
                        ? `BasePaint Day ${challenge.day} — everyone shares this canvas theme. Your five modifier cards are dealt uniquely on-chain when the daily is live.`
                        : 'Same story seed for all players today. Your hidden modifier hand makes each run different.'}
                    </p>
                    {challenge.promptText && (
                      <p className="text-xs text-muted-foreground pt-2 border-t border-emerald-500/10 mt-2 line-clamp-3">
                        {challenge.promptText}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-purple-500/20 bg-purple-950/10 overflow-hidden"
              >
                {challenge.canvasUrl && (
                  <div className="relative aspect-video w-full overflow-hidden">
                    <img
                      src={getBasePaintCanvasProxyUrl(challenge.day)}
                      alt={challenge.theme}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-mono text-purple-300">BasePaint Day {challenge.day}</span>
                    </div>
                  </div>
                )}

                {challenge.palette && challenge.palette.length > 0 && (
                  <div className="px-6 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Palette:</span>
                      <div className="flex gap-1">
                        {challenge.palette.slice(0, 8).map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-sm border border-white/10"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 space-y-4">
                  {dailyMode === 'live' ? (
                    <>
                      <button
                        onClick={handlePlay}
                        disabled={isPlayBusy}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-60"
                      >
                        {isPlayBusy ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {isSwitchingChain ? 'Switching to Base...' : 'Dealing encrypted cards...'}
                          </>
                        ) : !isConnected ? (
                          <>
                            <Wallet className="w-4 h-4" />
                            Connect Wallet to Play
                          </>
                        ) : onChainState?.incoSessionId ? (
                          <>
                            Continue Today&apos;s Challenge
                            <ArrowRight className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            Play Today&apos;s Challenge
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      {onChainState?.incoSessionId && (
                        <p className="text-xs text-emerald-400/80 text-center">
                          On-chain session active — 5 encrypted cards dealt
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground text-center">
                        {isConnected
                          ? 'Requires Base ETH for Inco fees. Modifier cards stay encrypted until the finale reveal.'
                          : 'Preview is free. Wallet connects only to deal your encrypted hand and submit a score.'}
                      </p>
                    </>
                  ) : (
                    <ArcadeFunnelCTAs
                      primaryLabel="Play in the arcade"
                      layout="stack"
                      className="!flex-col"
                    />
                  )}

                  {dailyMode === 'live' && (
                    <Link
                      href="/games"
                      className="flex items-center justify-center gap-1.5 text-xs font-medium text-purple-300 hover:text-purple-200"
                    >
                      <Gamepad2 className="w-3.5 h-3.5" />
                      Or browse the arcade first
                    </Link>
                  )}

                  {dailyMode === 'preview' && (
                    <button
                      type="button"
                      onClick={loadChallenge}
                      className="mx-auto flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Check if daily is live
                    </button>
                  )}
                </div>
              </motion.div>

              {leaderboard.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold">Today&apos;s Leaderboard</h2>
                    <span className="text-xs text-muted-foreground">
                      ({leaderboard.length} player{leaderboard.length !== 1 ? 's' : ''} revealed)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {leaderboard.slice(0, 10).map((entry, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4"
                      >
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0
                              ? 'bg-amber-500/20 text-amber-400'
                              : i === 1
                                ? 'bg-slate-400/20 text-slate-300'
                                : i === 2
                                  ? 'bg-orange-700/20 text-orange-400'
                                  : 'bg-white/5 text-muted-foreground'
                          }`}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {entry.gameTitle || `Player ${entry.playerAddress?.slice(2, 8)}`}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {entry.playerAddress?.slice(0, 6)}...{entry.playerAddress?.slice(-4)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-400">{entry.score}</p>
                          <p className="text-[10px] text-muted-foreground">pts</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : dailyMode === 'live' ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No players have revealed their score yet. Be the first!
                  </p>
                </div>
              ) : null}

              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-6 space-y-3">
                <h3 className="text-sm font-bold">How the Daily Challenge works</h3>
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Connect wallet and start an on-chain session — 5 encrypted cards are dealt</li>
                  <li>Generate and play a 5-panel comic shaped by today&apos;s BasePaint theme</li>
                  <li>Each choice updates your encrypted score on-chain via Inco</li>
                  <li>At the finale, reveal your hidden hand and join the leaderboard</li>
                </ol>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
