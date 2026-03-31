'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Lightbulb } from 'lucide-react'
import { GenreSelector, type GameGenre } from '@/components/game/GenreSelector'
import { DifficultySelector, type GameDifficulty } from '@/components/game/DifficultySelector'

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

function previewStyleFor(genre: GameGenre, difficulty: GameDifficulty) {
  const genreMap: Record<GameGenre, { gradient: string; blurb: string }> = {
    horror: { gradient: 'from-indigo-900 via-red-900 to-black', blurb: 'Dark, tense pacing with dramatic contrasts.' },
    comedy: { gradient: 'from-pink-600 via-blue-600 to-indigo-700', blurb: 'Light, playful tone with punchy beats.' },
    mystery: { gradient: 'from-blue-900 via-indigo-900 to-black', blurb: 'Moody, investigative with slow reveals.' },
  }
  const diffMap: Record<GameDifficulty, string> = {
    easy: 'Simpler choices, faster progression',
    hard: 'Deeper branches, more complex narratives',
  }
  const g = genreMap[genre]
  return { ...g, diff: diffMap[difficulty] }
}

function StylePreview({ genre, difficulty }: { genre: GameGenre; difficulty: GameDifficulty }) {
  const s = previewStyleFor(genre, difficulty)
  return (
    <div className="mx-auto max-w-md w-full">
      <motion.div
        key={`${genre}-${difficulty}`}
        className={`rounded-lg border border-purple-700/60 p-3 bg-gradient-to-br ${s.gradient} text-purple-100 shadow-md flex items-start gap-2`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <div className="mt-0.5">
          {genre === 'horror' && (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400 shadow" />
          )}
          {genre === 'comedy' && (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-300 shadow" />
          )}
          {genre === 'mystery' && (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-300 shadow" />
          )}
        </div>
        <div className="text-xs">
          <div className="font-semibold mb-1">Live Preview — {genre} • {difficulty}</div>
          <div className="opacity-95">{s.blurb}</div>
          <div className="opacity-90">{s.diff}</div>
        </div>
      </motion.div>
    </div>
  )
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
      className="pt-4 border-t border-gray-700"
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