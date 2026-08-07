'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Spade,
} from 'lucide-react'
import Link from 'next/link'
import { useAccount, usePublicClient } from 'wagmi'
import { formatEther } from 'viem'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useDailyChallengeOnchain } from '@/hooks/use-daily-challenge-onchain'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { ArcadeFunnelCTAs } from '@/components/daily-challenge/arcade-funnel-ctas'
import { DailyStatusBanner, type DailyStatusVariant } from '@/components/daily-challenge/daily-status-banner'
import { getBasePaintDay } from '@/lib/daily-challenge-ui'
import { getBasePaintCanvasProxyUrl } from '@/lib/daily-challenge'
import { DAILY_CHALLENGE_CHAIN_ID, readStartSessionFee } from '@/lib/daily-challenge-client'

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
  const { beginSession, detectExistingSession, isStarting, isDetecting, isSwitchingChain, state: onChainState, error: onChainError, reset } = useDailyChallengeOnchain()

  const feePublicClient = usePublicClient({ chainId: DAILY_CHALLENGE_CHAIN_ID })
  const [dealFeeWei, setDealFeeWei] = useState<bigint | null>(null)
  const detectionTriedRef = useRef<number | null>(null)

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    loadChallenge()
  }, [loadChallenge])

  const hasLiveSession =
    Boolean(onChainState?.incoSessionId) && onChainState?.day === challenge?.day

  // When a wallet connects, proactively look for a hand it already paid for
  // today (surfaces orphaned sessions as "Resume my hand" instead of a fresh buy).
  useEffect(() => {
    if (dailyMode !== 'live' || !isConnected || !challenge?.day) return
    if (hasLiveSession || isStarting || isDetecting) return
    if (detectionTriedRef.current === challenge.day) return
    detectionTriedRef.current = challenge.day
    void detectExistingSession(challenge.day)
  }, [dailyMode, isConnected, challenge?.day, hasLiveSession, isStarting, isDetecting, detectExistingSession])

  // Show the real deal fee next to the CTA so the cost is never a surprise.
  useEffect(() => {
    if (dailyMode !== 'live' || !feePublicClient) return
    let cancelled = false
    readStartSessionFee(feePublicClient)
      .then((fee) => { if (!cancelled) setDealFeeWei(fee) })
      .catch(() => { if (!cancelled) setDealFeeWei(null) })
    return () => { cancelled = true }
  }, [dailyMode, feePublicClient])

  const handlePlay = useCallback(async () => {
    setPlayError(null)

    if (dailyMode !== 'live') return

    if (!isConnected) {
      openConnectModal?.()
      return
    }

    try {
      if (onChainState?.incoSessionId && onChainState.day !== challenge?.day) {
        reset() // leftover session from a previous day
      }

      if (!hasLiveSession) {
        await beginSession()
      }

      if (challenge?.sourceType === 'basepaint') {
        window.location.href = `/generate?source=basepaint&day=${challenge.day}&daily=1`
      } else {
        window.location.href = '/generate?source=daily&daily=1'
      }
    } catch (err) {
      console.error('[DailyChallenge] Failed to start session:', err)
      setPlayError('play-error')
    }
  }, [beginSession, challenge, dailyMode, hasLiveSession, isConnected, onChainState, openConnectModal, reset])

  const isPlayBusy = isStarting || isSwitchingChain || isDetecting
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
                    ? 'Preview free below — connect on Base only when you\'re ready to play for the leaderboard.'
                    : 'Today\'s BasePaint theme is live. Play something in the arcade now — leaderboard scoring joins when setup finishes.'}
                </p>
              </div>

              {showStatusBanner && (
                <DailyStatusBanner
                  variant={statusVariant}
                  detail={playError === 'play-error' ? onChainError : null}
                />
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
                        {isDetecting && !isStarting && !isSwitchingChain ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Checking for your dealt hand...
                          </>
                        ) : isStarting || isSwitchingChain ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {isSwitchingChain ? 'Switching to Base...' : 'Dealing encrypted cards...'}
                          </>
                        ) : !isConnected ? (
                          <>
                            <Wallet className="w-4 h-4" />
                            Connect Wallet to Play
                          </>
                        ) : hasLiveSession ? (
                          <>
                            <Spade className="w-4 h-4" />
                            Resume my hand
                          </>
                        ) : (
                          <>
                            Play Today&apos;s Challenge
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <p className="text-xs text-center">
                        {hasLiveSession ? (
                          <span className="text-emerald-400/80">
                            Already paid — your 5 cards are dealt. Resuming is always free.
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {isConnected
                              ? dealFeeWei != null
                                ? `One deal fee ≈ ${formatEther(dealFeeWei)} ETH on Base — resuming later is always free.`
                                : 'One small fee deals your hand on Base — resuming later is always free.'
                              : 'Preview is free. Wallet connects only to deal your hand and submit a score.'}
                          </span>
                        )}
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

              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-6 space-y-4">
                <h3 className="text-sm font-bold">How today works</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: Spade, title: 'Deal', body: 'One small fee deals 5 hidden cards' },
                    { icon: Gamepad2, title: 'Play', body: 'Your secret hand shapes 5 panels' },
                    { icon: Trophy, title: 'Reveal', body: 'Finale reveals · score ranks on-chain' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg bg-white/[0.02] px-3 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-purple-500/10 text-purple-300">
                        <step.icon className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white">{step.title}</p>
                        <p className="text-[11px] leading-snug text-muted-foreground">{step.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <details className="group text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none font-medium text-purple-300 hover:text-purple-200">
                    How the encryption works
                  </summary>
                  <p className="pt-2 leading-relaxed">
                    The deck is shuffled once per day inside Inco&apos;s confidential compute. Your cards and
                    score stay encrypted until you reveal at the finale — not even we can peek. If anything
                    interrupts after payment, the same button resumes your dealt hand free; retries never
                    charge twice.
                  </p>
                </details>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
