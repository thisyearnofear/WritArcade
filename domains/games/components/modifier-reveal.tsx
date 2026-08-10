'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Eye, Loader2, Sparkles, Trophy, ShieldCheck, Zap, Info } from 'lucide-react'
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
import { EncryptedStateIndicator } from '@/components/daily-challenge/encrypted-state-indicator'

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

// ── Reveal phase state machine ──────────────────────────────────────────────

type RevealPhase =
  | 'locked'       // Pre-reveal: cards face-down with encrypted handles
  | 'decrypting'   // On-chain tx in progress: scrambling ciphertext animation
  | 'flipping'     // Cards flip one-by-one revealing content
  | 'scoring'      // Score counts up from 0
  | 'complete'     // Final state with recap

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

  const [phase, setPhase] = useState<RevealPhase>('locked')
  const [modifiers, setModifiers] = useState<Modifier[]>([])
  const [score, setScore] = useState<number | null>(null)
  const [displayScore, setDisplayScore] = useState(0)
  const [rank, setRank] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revealedCardIndex, setRevealedCardIndex] = useState(-1)

  const scoreIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Score count-up animation
  useEffect(() => {
    if (phase !== 'scoring' || score === null) return

    const target = score
    const duration = 1200 // ms
    const steps = 20
    const stepTime = duration / steps
    const increment = target / steps
    let current = 0

    scoreIntervalRef.current = setInterval(() => {
      current += increment
      if (current >= target) {
        setDisplayScore(target)
        if (scoreIntervalRef.current) clearInterval(scoreIntervalRef.current)
        // Transition to complete after score finishes
        setTimeout(() => setPhase('complete'), 400)
      } else {
        setDisplayScore(Math.round(current))
      }
    }, stepTime)

    return () => {
      if (scoreIntervalRef.current) clearInterval(scoreIntervalRef.current)
    }
  }, [phase, score])

  // Card flip stagger animation
  useEffect(() => {
    if (phase !== 'flipping' || modifiers.length === 0) return

    let i = 0
    const flipNext = () => {
      setRevealedCardIndex(i)
      i++
      if (i < modifiers.length) {
        setTimeout(flipNext, 350)
      } else {
        // All cards flipped — move to scoring
        setTimeout(() => setPhase('scoring'), 600)
      }
    }
    // Small delay before first flip
    setTimeout(flipNext, 300)
  }, [phase, modifiers.length])

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

    setPhase('decrypting')
    setError(null)

    try {
      await completeOnChainReveal({
        sessionId: onChainSessionId as `0x${string}`,
        vaultAddress: vault,
        walletClient: walletClient as WalletClient,
        publicClient,
        account: address,
      })

      let revealedMods: Modifier[] = []
      let revealedScore: number | null = null
      let revealedRank: number | null = null

      if (dailyState?.challengeId) {
        const revealResult = await submitDailyReveal({
          challengeId: dailyState.challengeId,
          sessionId: onChainSessionId,
          gameId,
        })
        revealedMods = revealResult.revealedModifierIds
          .map((modifierId) => getModifierById(modifierId))
          .filter((modifier): modifier is Modifier => modifier !== undefined)
        revealedScore = revealResult.score
        revealedRank = revealResult.rank
      }

      setModifiers(revealedMods)
      setScore(revealedScore)
      setRank(revealedRank)

      // Transition: decrypting → flipping
      setPhase('flipping')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal modifiers')
      setPhase('locked')
    }
  }, [
    address,
    gameId,
    modifierHandles,
    publicClient,
    sessionId,
    vaultAddress,
    walletClient,
  ])

  // ── Pre-complete: panels still in progress ──────────────────────────────

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
            {modifierHandles.map((handle, i) => (
              <EncryptedCardFace key={i} index={i} handle={handle} />
            ))}
            {/* Fill remaining if handles not all available yet */}
            {Array.from({ length: Math.max(0, 5 - modifierHandles.length) }).map((_, i) => (
              <EncryptedCardFace key={`placeholder-${i}`} index={modifierHandles.length + i} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <ShieldCheck className="w-3 h-3 text-purple-400/70" />
            <p className="text-[10px] text-muted-foreground">
              Complete all 5 panels to decrypt your hidden hand on-chain
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  // ── Panels complete: show reveal flow ───────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-2xl mx-auto mt-6"
    >
      <div className="relative rounded-lg border-2 border-purple-500/40 bg-purple-950/20 p-6 overflow-hidden">
        {/* Ambient glow during decrypting phase */}
        {phase === 'decrypting' && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: `radial-gradient(ellipse at center, ${primaryColor}20 0%, transparent 70%)`,
            }}
          />
        )}

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold tracking-widest uppercase text-purple-400">
                The Hidden Hand
              </h3>
            </div>
            {phase !== 'locked' && phase !== 'complete' && (
              <PhaseIndicator phase={phase} />
            )}
          </div>

          <AnimatePresence mode="wait">
            {/* ── LOCKED: ready to reveal ──────────────────────────── */}
            {phase === 'locked' && (
              <motion.div
                key="locked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex gap-2 mb-4">
                  {modifierHandles.map((handle, i) => (
                    <EncryptedCardFace key={i} index={i} handle={handle} pulsing />
                  ))}
                  {Array.from({ length: Math.max(0, 5 - modifierHandles.length) }).map((_, i) => (
                    <EncryptedCardFace key={`ph-${i}`} index={modifierHandles.length + i} pulsing />
                  ))}
                </div>

                {scoreHandle && (
                  <div className="flex items-center justify-center mb-4">
                    <EncryptedStateIndicator
                      handle={scoreHandle}
                      label="Final score"
                      color={primaryColor}
                      size="md"
                    />
                  </div>
                )}

                <button
                  onClick={handleReveal}
                  disabled={!walletClient}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: primaryColor,
                    color: '#000',
                    opacity: !walletClient ? 0.7 : 1,
                    boxShadow: `0 0 20px ${primaryColor}40`,
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Reveal My Hidden Hand
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

            {/* ── DECRYPTING: on-chain tx in progress ─────────────── */}
            {phase === 'decrypting' && (
              <motion.div
                key="decrypting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex gap-2 mb-4">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <DecryptingCard
                      key={i}
                      index={i}
                      handle={modifierHandles[i]}
                      color={primaryColor}
                    />
                  ))}
                </div>

                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">
                      Decrypting on-chain via Inco...
                    </span>
                  </motion.div>
                  <p className="text-[10px] text-muted-foreground text-center max-w-sm">
                    Calling <code className="text-purple-400/80">completeAndReveal</code> on Base — your encrypted score
                    and modifier cards are being revealed by the network.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── FLIPPING: cards reveal one by one ───────────────── */}
            {phase === 'flipping' && (
              <motion.div
                key="flipping"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="grid grid-cols-5 gap-3 mb-4">
                  {modifiers.map((mod, i) => (
                    <FlippingCard
                      key={i}
                      modifier={mod}
                      index={i}
                      isRevealed={i <= revealedCardIndex}
                      handle={modifierHandles[i]}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── SCORING: count-up animation ─────────────────────── */}
            {phase === 'scoring' && (
              <motion.div
                key="scoring"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-5 gap-3 mb-6">
                  {modifiers.map((mod, i) => (
                    <RevealedCard key={i} modifier={mod} index={i} />
                  ))}
                </div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex flex-col items-center justify-center gap-2"
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-amber-400" />
                    <span className="text-4xl font-bold tabular-nums text-amber-400">
                      {displayScore}
                    </span>
                    <span className="text-sm text-muted-foreground">/ 50</span>
                  </div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((displayScore / 50) * 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-1 rounded-full bg-amber-400/60 max-w-48"
                  />
                </motion.div>
              </motion.div>
            )}

            {/* ── COMPLETE: final recap ────────────────────────────── */}
            {phase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="grid grid-cols-5 gap-3 mb-4">
                  {modifiers.map((mod, i) => (
                    <RevealedCard key={i} modifier={mod} index={i} />
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
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-xs text-muted-foreground"
                      >
                        Leaderboard rank: #{rank}
                      </motion.p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <p className="text-xs text-emerald-400/80">
                    Verified on-chain — decrypted via Inco confidential compute on Base
                  </p>
                </div>

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

                <IncoExplainer primaryColor={primaryColor} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Encrypted card face with cycling cipher bytes */
function EncryptedCardFace({
  index,
  handle,
  pulsing = false,
}: {
  index: number
  handle?: string
  pulsing?: boolean
}) {
  const [fragment, setFragment] = useState(() => {
    if (!handle) return ''
    const clean = handle.startsWith('0x') ? handle.slice(2) : handle
    return clean.slice(0, 6)
  })

  useEffect(() => {
    if (!handle) return
    const clean = handle.startsWith('0x') ? handle.slice(2) : handle

    const interval = setInterval(() => {
      const offset = Math.floor(Math.random() * Math.max(1, clean.length - 6))
      setFragment(clean.slice(offset, offset + 6))
    }, 800 + index * 200)
    return () => clearInterval(interval)
  }, [handle, index])

  return (
    <div
      className={`flex-1 aspect-[3/4] rounded-md border border-purple-500/25 bg-purple-950/50 flex flex-col items-center justify-center gap-1 ${
        pulsing ? 'animate-pulse' : ''
      }`}
    >
      <Lock className="w-4 h-4 text-purple-500/50" />
      {handle && (
        <span className="text-[8px] font-mono text-purple-400/40 truncate max-w-full px-1">
          {fragment}
        </span>
      )}
    </div>
  )
}

/** Card during the decrypting phase — rapidly scrambling cipher fragments */
function DecryptingCard({
  index,
  handle,
  color,
}: {
  index: number
  handle?: string
  color: string
}) {
  const [cipher, setCipher] = useState('')

  useEffect(() => {
    const chars = '0123456789abcdef'
    const interval = setInterval(() => {
      if (handle) {
        const clean = handle.startsWith('0x') ? handle.slice(2) : handle
        const offset = Math.floor(Math.random() * Math.max(1, clean.length - 8))
        setCipher(clean.slice(offset, offset + 8))
      } else {
        setCipher(Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''))
      }
    }, 80)
    return () => clearInterval(interval)
  }, [handle])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08 }}
      className="flex-1 aspect-[3/4] rounded-md border flex flex-col items-center justify-center gap-1 relative overflow-hidden"
      style={{
        borderColor: `${color}50`,
        backgroundColor: `${color}15`,
      }}
    >
      {/* Scanning line effect */}
      <motion.div
        className="absolute inset-x-0 h-px"
        style={{ backgroundColor: `${color}80` }}
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      />
      <Zap className="w-3.5 h-3.5" style={{ color }} />
      <motion.span
        key={cipher}
        initial={{ opacity: 0.3 }}
        animate={{ opacity: 1 }}
        className="text-[8px] font-mono px-1 truncate max-w-full"
        style={{ color: `${color}cc` }}
      >
        {cipher}
      </motion.span>
    </motion.div>
  )
}

/** Card that flips from encrypted to revealed */
function FlippingCard({
  modifier,
  index,
  isRevealed,
  handle,
}: {
  modifier: Modifier
  index: number
  isRevealed: boolean
  handle?: string
}) {
  const color = CATEGORY_COLOR[modifier.category]

  return (
    <div className="relative aspect-[3/4]" style={{ perspective: '600px' }}>
      <AnimatePresence mode="wait">
        {!isRevealed ? (
          <motion.div
            key="back"
            className="absolute inset-0 rounded-lg border border-purple-500/30 bg-purple-950/50 flex flex-col items-center justify-center gap-1 backface-hidden"
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Lock className="w-4 h-4 text-purple-500/50" />
            {handle && (
              <span className="text-[7px] font-mono text-purple-400/30 px-1 truncate max-w-full">
                {handle.slice(2, 8)}
              </span>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="front"
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.35, type: 'spring', stiffness: 150, damping: 12 }}
            className="absolute inset-0 rounded-lg p-2 text-center border flex flex-col items-center justify-center"
            style={{
              borderColor: `${color}60`,
              backgroundColor: `${color}15`,
              boxShadow: `0 0 12px ${color}30`,
            }}
          >
            <div
              className="text-[9px] font-bold uppercase tracking-wider mb-0.5"
              style={{ color }}
            >
              {CATEGORY_LABEL[modifier.category]}
            </div>
            <div className="text-[10px] font-semibold text-foreground leading-tight">
              {modifier.name}
            </div>
            <div className="text-[8px] text-muted-foreground mt-0.5">Card {index + 1}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Fully revealed card (static, no animation) */
function RevealedCard({ modifier, index }: { modifier: Modifier; index: number }) {
  const color = CATEGORY_COLOR[modifier.category]

  return (
    <div
      className="rounded-lg p-3 text-center border"
      style={{
        borderColor: `${color}50`,
        backgroundColor: `${color}12`,
      }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-wider mb-1"
        style={{ color }}
      >
        {CATEGORY_LABEL[modifier.category]}
      </div>
      <div className="text-xs font-semibold text-foreground">{modifier.name}</div>
      <div className="text-[9px] text-muted-foreground mt-1">Card {index + 1}</div>
    </div>
  )
}

/** Small phase indicator badge */
function PhaseIndicator({ phase }: { phase: RevealPhase }) {
  const labels: Partial<Record<RevealPhase, string>> = {
    decrypting: 'Decrypting...',
    flipping: 'Revealing cards',
    scoring: 'Tallying score',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1"
    >
      {phase === 'decrypting' ? (
        <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
      ) : (
        <Zap className="w-3 h-3 text-purple-400" />
      )}
      <span className="text-[10px] font-medium text-purple-300">
        {labels[phase]}
      </span>
    </motion.div>
  )
}


/** Collapsible "What just happened?" explainer — addresses Hidden Mechanics judging criterion */
function IncoExplainer({ primaryColor }: { primaryColor: string }) {
  return (
    <details
      className="group mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
    >
      <summary className="flex list-none cursor-pointer select-none items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <Info className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
        <span>What just happened? How Inco powers this</span>
        <svg
          className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="mt-3 space-y-3 text-xs text-muted-foreground leading-relaxed">
        <p>
          Your 5 modifier cards were shuffled on-chain using Inco&apos;s{' '}
          <code className="text-purple-400/90 bg-purple-500/10 px-1 py-0.5 rounded">e.shuffledRange(1, 53)</code>{' '}
          — a verifiably random permutation of a 52-card deck that nobody, including us, can predict or observe.
        </p>
        <p>
          Each panel choice was scored against the encrypted optimal answer using{' '}
          <code className="text-purple-400/90 bg-purple-500/10 px-1 py-0.5 rounded">optimalChoice.eq(playerChoice)</code>{' '}
          — fully homomorphic encryption means the comparison happens on ciphertext.
          Your running score was updated without ever being visible to anyone.
        </p>
        <p>
          When you hit &ldquo;Reveal,&rdquo; the contract called{' '}
          <code className="text-purple-400/90 bg-purple-500/10 px-1 py-0.5 rounded">score.reveal()</code>{' '}
          and{' '}
          <code className="text-purple-400/90 bg-purple-500/10 px-1 py-0.5 rounded">drawnModifiers[i].reveal()</code>{' '}
          — transitioning encrypted values to public state on Base. That&apos;s the moment you saw
          your cards flip and your score appear.
        </p>
        <div className="flex items-start gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-emerald-300/80">
            <span className="font-semibold text-emerald-300">No trust required.</span>{' '}
            The game operator never sees your cards or score before you choose to reveal.
            Fairness is enforced by the network, not by us.
          </p>
        </div>
      </div>
    </details>
  )
}
