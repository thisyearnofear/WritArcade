'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Users, Clock, Zap, TrendingUp } from 'lucide-react'
import type { Modifier } from '@/lib/daily-challenge'
import type { PanelVerdict } from '@/lib/daily-challenge/daily-challenge-client'
import {
  getModifierCategoryForPanel,
  MODIFIER_CATEGORY_COLOR,
  MODIFIER_CATEGORY_LABEL,
} from '@/lib/daily-challenge/daily-challenge-ui'

// ── Resonance Pulse ──────────────────────────────────────────────────────────
// After each choice, shows how the panel actually scored against the hidden
// modifier card. When the on-chain FHE verdict (10 | 6 | 3 | 1) is available
// via attestedDecrypt, that value drives the indicator. While it decrypts, or
// when it fails (older vault, wrong network), we fall back to a keyword pulse
// from the choice text so the slot still feels alive.

const CATEGORY_KEYWORDS: Record<Modifier['category'], string[]> = {
  tone: ['feel', 'emotion', 'mood', 'quiet', 'loud', 'gentle', 'harsh', 'calm', 'tense', 'warm', 'cold', 'dark', 'light', 'soft', 'intense'],
  complication: ['but', 'however', 'twist', 'unexpected', 'surprise', 'problem', 'obstacle', 'challenge', 'difficult', 'wrong', 'fail', 'trap', 'catch', 'risk', 'danger'],
  stakes: ['lose', 'cost', 'sacrifice', 'everything', 'all', 'nothing', 'life', 'death', 'must', 'never', 'forever', 'final', 'last', 'only', 'grave'],
  resolution: ['resolve', 'end', 'together', 'finally', 'peace', 'accept', 'conclude', 'settle', 'answer', 'truth', 'reveal', 'understand', 'connect', 'close', 'complete'],
}

const VERDICT_CONFIG: Record<PanelVerdict, { label: string; sublabel: string; intensity: number; color: string }> = {
  10: {
    label: 'Direct hit',
    sublabel: 'Your choice matched the hidden modifier exactly',
    intensity: 3,
    color: '#34d399', // emerald
  },
  6: {
    label: 'Near miss',
    sublabel: 'One step off the hidden modifier — partial credit',
    intensity: 2,
    color: '#fbbf24', // amber
  },
  3: {
    label: 'Faint signal',
    sublabel: 'Far from the hidden modifier — small credit',
    intensity: 1,
    color: '#94a3b8', // slate
  },
  1: {
    label: 'Missed',
    sublabel: 'No alignment with the hidden modifier',
    intensity: 1,
    color: '#6b7280', // gray
  },
}

const PENDING_CONFIG = {
  label: 'Reading the hidden card…',
  sublabel: 'Decrypting this panel’s verdict from Inco',
  intensity: 2,
  color: '#8b5cf6', // violet
}

function getKeywordResonanceLevel(choiceText: string, panelIndex: number): 'strong' | 'moderate' | 'faint' {
  const category = getModifierCategoryForPanel(panelIndex)
  const keywords = CATEGORY_KEYWORDS[category]
  const lower = choiceText.toLowerCase()
  const hits = keywords.filter(k => lower.includes(k)).length

  if (hits >= 3) return 'strong'
  if (hits >= 1) return 'moderate'
  return 'faint'
}

interface ResonancePulseProps {
  /** The decrypted FHE verdict for this panel, or null while it is still decrypting. */
  verdict: PanelVerdict | null
  /** Choice text — used only for the fallback copy when verdict is null. */
  choiceText?: string
  panelIndex: number
  /** Whether to show (triggers on new choice) */
  visible: boolean
}

export function ResonancePulse({ verdict, choiceText = '', panelIndex, visible }: ResonancePulseProps) {
  const fallbackLevel = useMemo(
    () => getKeywordResonanceLevel(choiceText, panelIndex),
    [choiceText, panelIndex]
  )

  const config = verdict !== null ? VERDICT_CONFIG[verdict] : {
    // Fallback while decrypting, or when the vault has no panel verdict handle.
    ...(choiceText
      ? {
          strong: {
            label: 'Strong resonance',
            sublabel: 'Your instinct feels aligned — decrypting the real result…',
            intensity: 3,
            color: '#34d399',
          },
          moderate: {
            label: 'Faint resonance',
            sublabel: 'Something stirs — decrypting the real result…',
            intensity: 2,
            color: '#fbbf24',
          },
          faint: {
            label: 'Reading the hidden card…',
            sublabel: 'Decrypting this panel’s verdict from Inco',
            intensity: 1,
            color: '#6b7280',
          },
        }[fallbackLevel]
      : PENDING_CONFIG),
  }

  const category = getModifierCategoryForPanel(panelIndex)
  const categoryColor = MODIFIER_CATEGORY_COLOR[category]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-5xl mb-3 rounded-lg border px-4 py-3"
          style={{
            borderColor: `${config.color}30`,
            backgroundColor: `${config.color}08`,
          }}
        >
          <div className="flex items-center gap-3">
            {/* Pulse dots */}
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{
                    scale: i <= config.intensity ? 1 : 0.4,
                    opacity: i <= config.intensity ? 1 : 0.3,
                  }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 300 }}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: i <= config.intensity ? config.color : '#4b5563' }}
                />
              ))}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3" style={{ color: config.color }} />
                <span className="text-xs font-semibold" style={{ color: config.color }}>
                  {config.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  · {MODIFIER_CATEGORY_LABEL[category]} card
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {config.sublabel}
              </p>
            </div>

            {verdict === 10 && (
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Flame className="w-4 h-4" style={{ color: categoryColor }} />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Competitive Context Bar ──────────────────────────────────────────────────
// Shows live player count and average score to create competitive framing.

interface CompetitiveContextProps {
  playerCount: number
  averageScore: number | null
  topScore: number | null
}

export function CompetitiveContextBar({
  playerCount,
  averageScore,
  topScore,
}: CompetitiveContextProps) {
  if (playerCount === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-5xl mb-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-2"
    >
      <div className="flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{playerCount}</span> revealed today
        </span>
      </div>
      {averageScore !== null && (
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Avg: <span className="font-semibold text-foreground">{averageScore}</span>/50
          </span>
        </div>
      )}
      {topScore !== null && (
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs text-muted-foreground">
            Best: <span className="font-semibold text-amber-400">{topScore}</span>/50
          </span>
        </div>
      )}
      <span className="text-[10px] text-muted-foreground/60 ml-auto hidden sm:inline">
        Can you beat the average?
      </span>
    </motion.div>
  )
}

// ── Play Pace Timer ──────────────────────────────────────────────────────────
// Soft timer that shows elapsed time per panel and total session time.
// Not punitive — just creates a subtle sense of engagement and urgency.

interface PlayPaceTimerProps {
  /** When the current panel was first shown (Date.now()) */
  panelStartTime: number | null
  /** When the session started */
  sessionStartTime: number | null
  /** Current panel number (1-5) */
  panelNumber: number
  primaryColor?: string
}

export function PlayPaceTimer({
  panelStartTime,
  sessionStartTime,
  panelNumber,
  primaryColor = '#a855f7',
}: PlayPaceTimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const [totalElapsed, setTotalElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!panelStartTime) return
    setElapsed(0) // eslint-disable-line react-hooks/set-state-in-effect -- reset on new panel

    intervalRef.current = setInterval(() => {
      const now = Date.now()
      setElapsed(Math.floor((now - panelStartTime) / 1000))
      if (sessionStartTime) {
        setTotalElapsed(Math.floor((now - sessionStartTime) / 1000))
      }
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [panelStartTime, sessionStartTime])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  // Gentle color shift after 60s on a single panel (not punitive, just a nudge)
  const isLingering = elapsed > 60
  const timerColor = isLingering ? '#fbbf24' : primaryColor

  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <Clock className="w-3 h-3" style={{ color: timerColor }} />
      <span>
        Panel {panelNumber}/5 ·{' '}
        <span className="font-mono tabular-nums" style={{ color: isLingering ? timerColor : undefined }}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </span>
      {sessionStartTime && totalElapsed > 30 && (
        <span className="text-muted-foreground/50">
          · {Math.floor(totalElapsed / 60)}:{(totalElapsed % 60).toString().padStart(2, '0')} total
        </span>
      )}
    </div>
  )
}
