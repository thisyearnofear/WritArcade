'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { PaymentOption } from '@/components/game/PaymentOption'
import { type WriterCoin } from '@/lib/writerCoins'
import type { GameGenre } from '@/components/game/GenreSelector'
import type { GameDifficulty } from '@/components/game/DifficultySelector'
import type { PaymentResult } from '@/domains/payments/strategies/payment-strategy'
import { StylePreview } from '@/domains/games/components/game-generator-helpers'

interface PaymentStepProps {
  writerCoin: WriterCoin
  genre: GameGenre
  difficulty: GameDifficulty
  onPaymentSuccess: (payment: PaymentResult) => void
  onPaymentError: (error: string) => void
  isGenerating: boolean
}

export function PaymentStep({
  writerCoin,
  genre,
  difficulty,
  onPaymentSuccess,
  onPaymentError,
  isGenerating,
}: PaymentStepProps) {
  return (
    <motion.div
      className="space-y-4 p-5 rounded-xl border-2 border-cyan-500/50 bg-gradient-to-br from-slate-950/90 to-cyan-950/60 shadow-xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-cyan-300" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-cyan-50 mb-1">Confirm Your Customization</h3>
          <p className="text-sm text-cyan-100/90 mb-3">
            You've selected custom options below. Approve payment to generate with these settings.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-slate-900/60 border border-cyan-500/30 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-cyan-100">
          <span>📋</span>
          <span>Your Selections</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-950/50 border border-indigo-500/40">
            <div className="text-xs text-indigo-300 mb-1">Genre</div>
            <div className="font-semibold text-white capitalize flex items-center gap-2">
              {genre === 'horror' && '🎃'}
              {genre === 'comedy' && '😄'}
              {genre === 'mystery' && '🔍'}
              {genre}
            </div>
            <div className="text-xs text-purple-300/80 mt-1">
              {genre === 'horror' && 'Dark, high stakes'}
              {genre === 'comedy' && 'Light, witty beats'}
              {genre === 'mystery' && 'Clues and reveals'}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-slate-950/50 border border-cyan-500/40">
            <div className="text-xs text-cyan-300 mb-1">Difficulty</div>
            <div className="font-semibold text-white capitalize flex items-center gap-2">
              {difficulty === 'easy' && '⚡'}
              {difficulty === 'hard' && '🎯'}
              {difficulty}
            </div>
            <div className="text-xs text-purple-300/80 mt-1">
              {difficulty === 'easy' && 'Faster progression'}
              {difficulty === 'hard' && 'Deeper branches'}
            </div>
          </div>
        </div>

        <div className="pt-2">
          <StylePreview genre={genre} difficulty={difficulty} />
        </div>
      </div>

      <PaymentOption
        writerCoin={writerCoin}
        action="generate-game"
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        disabled={isGenerating}
      />

      <p className="text-xs text-purple-300/70 text-center">
        Payment is required to generate games with custom settings
      </p>
    </motion.div>
  )
}
