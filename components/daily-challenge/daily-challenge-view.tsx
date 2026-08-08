'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Users,
  Sparkles,
  ArrowRight,
  Loader2,
  Wallet,
  Gamepad2,
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
import { DailyChallengeSubnav } from '@/components/daily-challenge/daily-challenge-subnav'
import { BasePaintCanvasMeta } from '@/components/basepaint/basepaint-canvas-meta'
import { BasePaintTrack } from '@/components/basepaint/basepaint-track'
import { ArcadeFunnelCTAs } from '@/components/daily-challenge/arcade-funnel-ctas'
import { DailyStatusBanner, type DailyStatusVariant } from '@/components/daily-challenge/daily-status-banner'
import { getBasePaintDay } from '@/lib/daily-challenge/daily-challenge-ui'
import { getBasePaintCanvasProxyUrl } from '@/lib/basepaint'
import { DAILY_CHALLENGE_CHAIN_ID, readStartSessionFee } from '@/lib/daily-challenge/daily-challenge-client'

export type DailyChallengeVariant = 'arcade' | 'basepaint'

interface CanvasStats {
  pixelsCount: number
  totalArtists: number
  totalMints: number
  topContributors: Array<{ address: string; pixelsCount: number }>
}

interface DailyChallengeData {
  day: number
  sourceType: string
  theme: string
  sourceUrl?: string
  articleTitle?: string
  articleAuthor?: string
  canvasTheme?: string
  palette?: string[]
  canvasUrl?: string
  promptText?: string
  canvasDescription?: string
  stats?: CanvasStats
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
      sourceType: data.sourceType || 'basepaint',
      theme: data.theme,
      sourceUrl: data.sourceUrl,
      articleTitle: data.articleTitle,
      articleAuthor: data.articleAuthor,
      canvasTheme: data.canvasTheme,
      palette: data.palette,
      canvasUrl: data.canvasUrl,
      promptText: data.promptText,
      canvasDescription: data.canvasDescription,
      stats: data.stats,
    }
  } catch {
    return null
  }
}

export interface DailyChallengeViewProps {
  variant?: DailyChallengeVariant
}

export function DailyChallengeView({ variant = 'arcade' }: DailyChallengeViewProps) {
  const isBasePaint = variant === 'basepaint'

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
    } else if (
      (nextChallenge.sourceType === 'basepaint' || nextChallenge.sourceType === 'dual') &&
      !nextChallenge.stats
    ) {
      const enriched = await fetchBasePaintPreview(nextChallenge.day)
      if (enriched) {
        nextChallenge = {
          ...nextChallenge,
          ...enriched,
          theme: nextChallenge.theme || enriched.theme,
          sourceType: nextChallenge.sourceType || enriched.sourceType,
          sourceUrl: nextChallenge.sourceUrl || enriched.sourceUrl,
          articleTitle: nextChallenge.articleTitle || enriched.articleTitle,
          articleAuthor: nextChallenge.articleAuthor || enriched.articleAuthor,
        }
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

  useEffect(() => {
    if (dailyMode !== 'live' || !isConnected || !challenge?.day) return
    if (hasLiveSession || isStarting || isDetecting) return
    if (detectionTriedRef.current === challenge.day) return
    detectionTriedRef.current = challenge.day
    void detectExistingSession(challenge.day)
  }, [dailyMode, isConnected, challenge?.day, hasLiveSession, isStarting, isDetecting, detectExistingSession])

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
        reset()
      }
      if (!hasLiveSession) {
        await beginSession()
      }
      if (challenge?.sourceType === 'basepaint' || challenge?.sourceType === 'dual') {
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

  const accentBtn = 'bg-purple-600 hover:bg-purple-500 text-white'
  const badgeClass = 'border-purple-500/30 bg-purple-950/40 text-purple-400'

  return (
    <ThemeWrapper theme="arcade">
      <div className="relative flex min-h-screen flex-col">
        {isBasePaint && <BasePaintTrack />}
        <Header />
        {isBasePaint && <DailyChallengeSubnav />}

        <main
          id="main-content"
          className="flex-1 bg-gradient-to-b from-purple-950/20 via-black to-black text-white"
        >
          {loading ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : !challenge ? (
            <div className="mx-auto max-w-lg space-y-6 px-4 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Daily Challenge is taking a breather</h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {isBasePaint
                    ? "We couldn't load today's BasePaint canvas — try again in a moment, or browse the arcade."
                    : "We couldn't load today's theme right now — but the arcade is open."}
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
            <div className="mx-auto max-w-4xl space-y-10 px-4 py-8 md:py-12">
              {/* Dual/BasePaint hero — one composition: canvas plane + plot + CTA */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl border border-white/10"
              >
                <div className="relative min-h-[420px] md:min-h-[480px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getBasePaintCanvasProxyUrl(challenge.day)}
                    alt={challenge.canvasTheme || challenge.theme}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />
                  <div className="relative flex min-h-[420px] flex-col justify-end gap-5 p-6 md:min-h-[480px] md:p-10">
                    <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 ${badgeClass}`}>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {dailyMode === 'live' ? 'Daily Challenge' : "Today's Theme"}
                      </span>
                    </div>

                    {challenge.sourceType === 'dual' ? (
                      <div className="space-y-2 max-w-xl">
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                          Plot · featured writer
                        </p>
                        <h1 className="text-3xl font-bold leading-tight md:text-4xl">
                          {challenge.articleTitle || challenge.theme}
                        </h1>
                        {challenge.articleAuthor && (
                          <p className="text-sm text-white/75">by {challenge.articleAuthor}</p>
                        )}
                        <p className="text-sm text-white/65">
                          Staged in today&apos;s world — BasePaint Day {challenge.day}
                          {challenge.canvasTheme ? ` · ${challenge.canvasTheme}` : ''}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-w-xl">
                        <h1 className="text-3xl font-bold leading-tight md:text-4xl">
                          {challenge.theme}
                        </h1>
                        <p className="text-sm text-white/65">
                          BasePaint Day {challenge.day} — same canvas for everyone today
                        </p>
                      </div>
                    )}

                    <p className="max-w-lg text-sm text-white/70">
                      {dailyMode === 'live'
                        ? 'Same source for all players. Your five encrypted modifier cards deal a unique story hand on Base.'
                        : 'Preview today’s world below. Leaderboard scoring joins when on-chain setup finishes.'}
                    </p>

                    <div className="space-y-3 max-w-md">
                      {dailyMode === 'live' ? (
                        <>
                          <button
                            onClick={handlePlay}
                            disabled={isPlayBusy}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-semibold transition-all disabled:opacity-60 ${accentBtn}`}
                          >
                            {isDetecting && !isStarting && !isSwitchingChain ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Checking for your dealt hand...
                              </>
                            ) : isStarting || isSwitchingChain ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {isSwitchingChain ? 'Switching to Base...' : 'Dealing encrypted cards...'}
                              </>
                            ) : !isConnected ? (
                              <>
                                <Wallet className="h-4 w-4" />
                                Connect Wallet to Play
                              </>
                            ) : hasLiveSession ? (
                              <>
                                <Spade className="h-4 w-4" />
                                Resume my hand
                              </>
                            ) : (
                              <>
                                Play today&apos;s challenge
                                <ArrowRight className="h-4 w-4" />
                              </>
                            )}
                          </button>
                          <p className="text-xs text-white/55">
                            {hasLiveSession
                              ? 'Already paid — your 5 cards are dealt. Resuming is always free.'
                              : isConnected
                                ? dealFeeWei != null
                                  ? `One deal fee ≈ ${formatEther(dealFeeWei)} ETH on Base — resuming later is free.`
                                  : 'One small fee deals your hand on Base — resuming later is free.'
                                : 'Wallet connects only to deal your hand and submit a score.'}
                          </p>
                        </>
                      ) : (
                        <ArcadeFunnelCTAs primaryLabel="Play in the arcade" layout="stack" className="!flex-col" />
                      )}
                      {challenge.sourceType === 'dual' && challenge.sourceUrl && (
                        <a
                          href={challenge.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-xs text-purple-200/90 hover:underline"
                        >
                          Read the featured article
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.section>

              {showStatusBanner && (
                <DailyStatusBanner
                  variant={statusVariant}
                  detail={playError === 'play-error' ? onChainError : null}
                />
              )}

              {(challenge.sourceType === 'basepaint' || challenge.sourceType === 'dual') && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <BasePaintCanvasMeta
                    day={challenge.day}
                    theme={challenge.canvasTheme || challenge.theme}
                    palette={challenge.palette}
                    canvasDescription={challenge.canvasDescription}
                    stats={challenge.stats}
                    showMedia={false}
                  />
                </motion.div>
              )}

              <div className="flex flex-col items-center gap-3">
                {dailyMode === 'live' && (
                  <Link
                    href="/games"
                    className="flex items-center justify-center gap-1.5 text-xs font-medium text-purple-300 hover:text-purple-200"
                  >
                    <Gamepad2 className="h-3.5 w-3.5" />
                    Or browse the arcade first
                  </Link>
                )}
                {dailyMode === 'preview' && (
                  <button
                    type="button"
                    onClick={loadChallenge}
                    className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Check if daily is live
                  </button>
                )}
              </div>

              {leaderboard.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-400" />
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
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
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
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {entry.gameTitle || `Player ${entry.playerAddress?.slice(2, 8)}`}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
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
                <div className="py-8 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No players have revealed their score yet. Be the first!
                  </p>
                </div>
              ) : null}

              {isBasePaint && challenge && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Recent BasePaint days
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 7 }, (_, i) => challenge.day - i).map((d) =>
                      d >= 1 ? (
                        <Link
                          key={d}
                          href={d === challenge.day ? '/basepaint' : `/basepaint/day/${d}`}
                          className={`rounded-md border px-2.5 py-1 font-mono text-xs ${
                            d === challenge.day
                              ? 'border-purple-500/50 bg-purple-950/40 text-purple-200'
                              : 'border-white/10 text-white/60 hover:border-purple-500/40 hover:text-purple-200'
                          }`}
                        >
                          Day {d}
                        </Link>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4 rounded-lg border border-white/5 bg-white/[0.02] p-6">
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
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
