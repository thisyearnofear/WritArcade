'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Lightbulb } from 'lucide-react'
import { GenreSelector, type GameGenre } from '@/components/game/GenreSelector'
import { DifficultySelector, type GameDifficulty } from '@/components/game/DifficultySelector'
import { StylePreview } from '@/domains/games/components/game-generator-helpers'

interface CustomizationStepProps {
  genre: GameGenre
  difficulty: GameDifficulty
  paymentApproved: boolean
  showCustomization: boolean
  onToggleCustomization: () => void
  onGenreChange: (genre: GameGenre) => void
  onDifficultyChange: (difficulty: GameDifficulty) => void
  onResetDefaults: () => void
  isGenerating: boolean
}

export function CustomizationStep({
  genre,
  difficulty,
  paymentApproved,
  showCustomization,
  onToggleCustomization,
  onGenreChange,
  onDifficultyChange,
  onResetDefaults,
  isGenerating,
}: CustomizationStepProps) {
  return (
    <motion.div
      className="pt-4 border-t border-border"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      <motion.button
        type="button"
        onClick={onToggleCustomization}
        className="w-full text-sm font-medium text-purple-400 hover:text-purple-300 flex items-center gap-2"
        whileHover={{ x: 5 }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.span
          initial={{ rotate: 0 }}
          animate={{ rotate: showCustomization ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {showCustomization ? '▼' : '▶'}
        </motion.span>
        <Sparkles className="w-4 h-4 text-yellow-300" />
        <span>Game Customization</span>
        <span className="ml-auto text-xs text-purple-300/80">Required • Paid Feature</span>
      </motion.button>

      <AnimatePresence>
        {showCustomization && (
          <motion.div
            className="mt-4 space-y-4 p-5 rounded-xl border-2 border-indigo-500/40 bg-gradient-to-br from-slate-900/80 to-indigo-950/60 shadow-lg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-purple-100">Preview & Customize</span>
                  {paymentApproved ? (
                    <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded-full text-xs text-green-300">
                      ✓ Paid
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/50 rounded-full text-xs text-amber-300">
                      Preview Mode
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="text-xs text-indigo-300 hover:text-indigo-200 underline decoration-dotted disabled:opacity-50"
                  onClick={onResetDefaults}
                  disabled={isGenerating}
                >
                  Reset to defaults
                </button>
              </div>

              <StylePreview genre={genre} difficulty={difficulty} />

              <div className="flex justify-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-full bg-purple-800/80 border border-purple-500/80 px-3 py-1 text-purple-100 font-medium">
                  {genre}
                </span>
                <span className="inline-flex items-center rounded-full bg-purple-800/80 border border-purple-500/80 px-3 py-1 text-purple-100 font-medium">
                  {difficulty}
                </span>
              </div>

              <GenreSelector value={genre} onChange={onGenreChange} disabled={isGenerating} />
              <DifficultySelector value={difficulty} onChange={onDifficultyChange} disabled={isGenerating} />

              <motion.div
                className="p-3 rounded-lg bg-purple-900/50 border border-purple-500/30 text-sm text-purple-100 flex items-start gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-300" />
                <div className="space-y-1 text-xs">
                  <div>• <strong>Genre</strong> shapes narrative tone and visual style</div>
                  <div>• <strong>Difficulty</strong> controls branching complexity</div>
                  <div className="mt-2 pt-2 border-t border-purple-500/20 text-yellow-200">
                    {paymentApproved ? (
                      <span className="text-green-300">✓ Payment approved - ready to generate!</span>
                    ) : (
                      <span>💳 Payment required to generate Story games</span>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}