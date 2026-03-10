'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CharacterProfile, GameMechanic, StoryBeat } from '@/domains/games/types'
import { cn } from '@/lib/utils'

interface BalanceGaugeProps {
  characters: CharacterProfile[]
  mechanics: GameMechanic[]
  storyBeats: StoryBeat[]
}

/**
 * CONSOLIDATION: Balance gauge using CSS variables
 */
export function BalanceGauge({
  characters,
  mechanics,
  storyBeats
}: BalanceGaugeProps) {
  const score = useMemo(() => {
    let points = 0

    // Has enough characters (20 points)
    if (characters.length >= 2 && characters.length <= 5) {
      points += 20
    } else if (characters.length > 0) {
      points += 10
    }

    // Has enough mechanics (20 points)
    if (mechanics.length >= 1 && mechanics.length <= 4) {
      points += 20
    } else if (mechanics.length > 0) {
      points += 10
    }

    // Has story beats (20 points)
    if (storyBeats.length >= 3 && storyBeats.length <= 6) {
      points += 20
    } else if (storyBeats.length > 0) {
      points += 10
    }

    // Character-to-mechanic ratio (20 points)
    const charToMechRatio = characters.length > 0 ? mechanics.length / characters.length : 0
    if (charToMechRatio >= 0.5 && charToMechRatio <= 1.5) {
      points += 20
    } else if (charToMechRatio > 0) {
      points += 10
    }

    // All three types present (20 points)
    if (characters.length > 0 && mechanics.length > 0 && storyBeats.length > 0) {
      points += 20
    }

    return Math.min(100, points)
  }, [characters.length, mechanics.length, storyBeats.length])

  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference

  const statusColor =
    score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500'
  const ringColor =
    score >= 80 ? 'stroke-green-500' : score >= 60 ? 'stroke-yellow-500' : 'stroke-red-500'

  return (
    <div className="flex items-center gap-4">
      {/* Gauge ring */}
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className={cn(ringColor, "transition-colors")}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={cn("text-2xl font-bold", statusColor)}
          >
            {score}
          </motion.div>
          <div className="text-xs text-muted-foreground">Balance</div>
        </div>
      </div>

      {/* Status text */}
      <div className="flex-1">
        <p className={cn("text-sm font-bold", statusColor)}>
          {score >= 80
            ? 'Well Balanced'
            : score >= 60
              ? 'Good Progress'
              : 'Needs Work'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {score >= 80
            ? 'Your composition is ready for deployment'
            : score >= 60
              ? 'Add more assets to improve balance'
              : 'Complete the composition structure'}
        </p>
      </div>
    </div>
  )
}
