'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Users, Sparkles, ArrowRight, Image as ImageIcon, Loader2, Wallet, Gamepad2, Eye } from 'lucide-react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { config } from '@/lib/config'
import { useDailyChallengeOnchain } from '@/hooks/use-daily-challenge-onchain'

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

export default function DailyChallengePage() {
  const [challenge, setChallenge] = useState<DailyChallengeData | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [deckReady, setDeckReady] = useState(true)
  const [deckSetupError, setDeckSetupError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playError, setPlayError] = useState<string | null>(null)

  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { beginSession, isStarting, isSwitchingChain, state: onChainState } = useDailyChallengeOnchain()

  useEffect(() => {
    async function fetchChallenge() {
      if (!config.features.dailyChallenge) {
        setError('Daily challenge is not enabled')
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/daily-challenge/start')
        if (!response.ok) throw new Error('Failed to fetch challenge')
        const data = await response.json()
        setChallenge(data.challenge || data.source)
        setLeaderboard(data.leaderboard || [])
        setDeckReady(data.deckShuffled !== false)
        setDeckSetupError(data.deckSetupError || null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load challenge')
      } finally {
        setLoading(false)
      }
    }
    fetchChallenge()
  }, [])

  const handlePlay = useCallback(async () => {
    setPlayError(null)

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
    } catch (err) {
      setPlayError(err instanceof Error ? err.message : 'Failed to start on-chain session')
    }
  }, [beginSession, challenge, isConnected, onChainState?.incoSessionId, openConnectModal])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-2">
          <p className="text-red-400">{error}</p>
          <Link href="/" className="text-sm text-purple-400 hover:underline">← Back home</Link>
        </div>
      </div>
    )
  }

  const isPlayBusy = isStarting || isSwitchingChain

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950/20 via-black to-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/40">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-bold tracking-widest uppercase text-purple-400">
              Daily Challenge
            </span>
          </div>
          <h1 className="text-4xl font-bold">{challenge?.theme || "Today's Challenge"}</h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Preview today&apos;s source free — no wallet required. Connect on Base when you&apos;re ready to draw your encrypted modifier hand.
          </p>
          <Link
            href="/games"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-300 hover:text-purple-200"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            Or browse the arcade first
          </Link>
        </div>

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
                {challenge?.sourceType === 'basepaint'
                  ? `BasePaint Day ${challenge.day} — everyone plays this canvas theme. Your five modifier cards are dealt uniquely on-chain when you connect.`
                  : 'Same story seed for all players today. Your hidden modifier hand makes each run different.'}
              </p>
              {challenge?.promptText && (
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
          {challenge?.canvasUrl && (
            <div className="relative aspect-video w-full overflow-hidden">
              <img
                src={challenge.canvasUrl}
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

          {challenge?.palette && challenge.palette.length > 0 && (
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

          <div className="p-6">
            <button
              onClick={handlePlay}
              disabled={isPlayBusy || !deckReady}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-60"
            >
              {isPlayBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isSwitchingChain ? 'Switching to Base...' : 'Dealing encrypted cards...'}
                </>
              ) : !deckReady ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing today&apos;s deck...
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
              <p className="text-xs text-emerald-400/80 text-center mt-2">
                On-chain session active — 5 encrypted cards dealt
              </p>
            )}

            {playError && <p className="text-xs text-red-400 text-center mt-2">{playError}</p>}
            {!deckReady && deckSetupError && (
              <p className="text-xs text-amber-400/90 text-center mt-2">{deckSetupError}</p>
            )}

            <p className="text-xs text-muted-foreground text-center mt-3">
              {isConnected
                ? 'Requires Base ETH for Inco fees. Modifier cards stay encrypted until the finale reveal.'
                : 'Preview is free. Wallet connects only to deal your encrypted hand and submit a score.'}
            </p>
          </div>
        </motion.div>

        {leaderboard.length > 0 && (
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
        )}

        {leaderboard.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No players have revealed their score yet. Be the first!
            </p>
          </div>
        )}

        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-6 space-y-3">
          <h3 className="text-sm font-bold">How the Daily Challenge works</h3>
          <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Connect wallet and start an on-chain session — 5 encrypted cards are dealt</li>
            <li>Generate and play a 5-panel comic shaped by today&apos;s BasePaint theme</li>
            <li>Each choice updates your encrypted score on-chain via Inco</li>
            <li>At the finale, reveal your hidden hand and join the leaderboard</li>
          </ol>
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
            ← Back to WritersArcade
          </Link>
        </div>
      </div>
    </div>
  )
}
