'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Eye, Loader2, Sparkles, Trophy } from 'lucide-react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import type { WalletClient } from 'viem'
import { getModifierById, type Modifier } from '@/lib/daily-challenge'
import {
  completeOnChainReveal,
  loadDailyChallengeState,
  submitDailyReveal,
  DAILY_CHALLENGE_CHAIN_ID,
} from '@/lib/daily-challenge/daily-challenge-client'
import { DailySessionRecap } from '@/components/daily-challenge/daily-session-recap'
import { DualSourceCredits } from '@/components/basepaint/dual-source-credits'
import { BasePaintFinaleAttribution } from '@/components/basepaint/basepaint-finale-attribution'

interface ModifierRevealProps {
  gameId: string
  gameSlug: string
  gameTitle?: string
  sessionId: string | null
  vaultAddress: string
  modifierHandles: string[]
  scoreHandle: string | null
  isComplete: boolean
  primaryColor: string
  basePaintDay?: number | null
  articleUrl?: string | null
}

const CATEGORY_LABEL: Record<Modifier['category'], string> = {
  tone: 'Tone',
  complication: 'Complication',
  stakes: 'Stakes',
  resolution: 'Resolution',
}

const CATEGORY_COLOR: Record<Modifier['category'], string> = {
  tone: '#a78bfa',
  complication: '#fb923c',
  stakes: '#f87171',
  resolution: '#34d399',
}

export function ModifierReveal({
  gameId,
  gameSlug,
  gameTitle,
  sessionId,
  vaultAddress,
  modifierHandles,
  scoreHandle,
  isComplete,
  primaryColor,
  basePaintDay,
  articleUrl,
}: ModifierRevealProps) {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient({ chainId: DAILY_CHALLENGE_CHAIN_ID })
  const [revealed, setRevealed] = useState(false)
  const [isRevealing, setIsRevealing] = useState(false)
  const [modifiers, setModifiers] = useState<Modifier[]>([])
  const [score, setScore] = useState<number | null>(null)
  const [rank, setRank] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleReveal = useCallback(async () => {
    if (!walletClient || !address || !publicClient || !modifierHandles.length) {
      setError('Wallet connection required to reveal your modifiers')
      return
    }

    const dailyState = loadDailyChallengeState()
    const onChainSessionId = sessionId || dailyState?.incoSessionId
    const vault = (vaultAddress || dailyState?.vaultAddress) as `0x${string}` | undefined

    if (!onChainSessionId || !vault) {
      setError('On-chain session not found')
      return
    }

    setIsRevealing(true)
    setError(null)

    try {
      await completeOnChainReveal({
        sessionId: onChainSessionId as `0x${string}`,
        vaultAddress: vault,
        walletClient: walletClient as WalletClient,
        publicClient,
        account: address,
      })

      if (dailyState?.challengeId) {
        const revealResult = await submitDailyReveal({
          challengeId: dailyState.challengeId,
          sessionId: onChainSessionId,
          gameId,
        })
        setModifiers(
          revealResult.revealedModifierIds
            .map((modifierId) => getModifierById(modifierId))
            .filter((modifier): modifier is Modifier => modifier !== undefined)
        )
        setScore(revealResult.score)
        setRank(revealResult.rank)
      }

      setRevealed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal modifiers')
    } finally {
      setIsRevealing(false)
    }
  }, [
    address,
    gameId,
    modifierHandles,
    publicClient,
    scoreHandle,
    sessionId,
    vaultAddress,
    walletClient,
  ])

  if (!isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-2xl mx-auto mt-6"
      >
        <div className="rounded-lg border-2 border-purple-500/30 bg-purple-950/20 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold tracking-widest uppercase text-purple-400">
              Hidden Hand
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Your story was shaped by 5 encrypted modifier cards drawn from a shuffled 52-card deck via Inco.
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex-1 aspect-[3/4] rounded-md border border-purple-500/20 bg-purple-950/40 flex items-center justify-center"
              >
                <Lock className="w-5 h-5 text-purple-500/40" />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Complete all 5 panels to reveal your hidden hand
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-2xl mx-auto mt-6"
    >
      <div className="rounded-lg border-2 border-purple-500/40 bg-purple-950/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-bold tracking-widest uppercase text-purple-400">
            The Hidden Hand
          </h3>
        </div>

        <AnimatePresence mode="wait">
          {revealed ? (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="grid grid-cols-5 gap-3 mb-4">
                {modifiers.map((mod, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="rounded-lg p-3 text-center border"
                    style={{
                      borderColor: `${CATEGORY_COLOR[mod.category]}40`,
                      backgroundColor: `${CATEGORY_COLOR[mod.category]}10`,
                    }}
                  >
                    <div
                      className="text-[10px] font-bold uppercase tracking-wider mb-1"
                      style={{ color: CATEGORY_COLOR[mod.category] }}
                    >
                      {CATEGORY_LABEL[mod.category]}
                    </div>
                    <div className="text-xs font-semibold text-foreground">{mod.name}</div>
                    <div className="text-[9px] text-muted-foreground mt-1">Card {i + 1}</div>
                  </motion.div>
                ))}
              </div>

              {score !== null && (
                <div className="flex flex-col items-center justify-center gap-1 mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span className="text-2xl font-bold text-amber-400">{score}</span>
                    <span className="text-sm text-muted-foreground">/ 50 points</span>
                  </div>
                  {rank !== null && (
                    <p className="text-xs text-muted-foreground">Leaderboard rank: #{rank}</p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                These 5 cards were dealt from today&apos;s shuffled on-chain deck. Your score is now on the leaderboard.
              </p>

              {score !== null && modifiers.length > 0 && (
                <DailySessionRecap
                  gameSlug={gameSlug}
                  gameTitle={gameTitle}
                  modifiers={modifiers}
                  score={score}
                  rank={rank}
                  primaryColor={primaryColor}
                />
              )}

              {(basePaintDay != null || articleUrl) && (
                <DualSourceCredits
                  articleUrl={articleUrl}
                  basePaintDay={basePaintDay}
                  primaryColor={primaryColor}
                  variant="full"
                  className="mt-4"
                />
              )}
            </motion.div>
          ) : (
            <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex-1 aspect-[3/4] rounded-md border border-purple-500/30 bg-purple-950/40 flex items-center justify-center animate-pulse"
                  >
                    <Lock className="w-5 h-5 text-purple-500/60" />
                  </div>
                ))}
              </div>

              <button
                onClick={handleReveal}
                disabled={isRevealing || !walletClient}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all"
                style={{
                  backgroundColor: primaryColor,
                  color: '#000',
                  opacity: isRevealing || !walletClient ? 0.7 : 1,
                }}
              >
                {isRevealing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Revealing on-chain...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Reveal My Hidden Hand
                  </>
                )}
              </button>

              {!walletClient && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Connect your wallet on Base to reveal via Inco
                </p>
              )}

              {error && <p className="text-xs text-red-400 text-center mt-2">{error}</p>}

              {basePaintDay != null && (
                <div className="mt-4 pt-4 border-t border-purple-500/20">
                  <BasePaintFinaleAttribution
                    day={basePaintDay}
                    variant="mint-only"
                    primaryColor={primaryColor}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
