'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState, useMemo } from 'react'
import { Loader2, Sparkles, Gamepad2, X, Lightbulb, BookOpen, Quote } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'

type LoadingStep = 'validate' | 'extract' | 'generate' | 'save'
type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error'

interface GameGenerationOverlayProps {
  isOpen: boolean
  currentStep: LoadingStep | null
  stepStatuses: Record<LoadingStep, StepStatus>
  genre?: string
  difficulty?: string
  /** Called when the user manually cancels or the 60s timeout fires */
  onCancel?: () => void
}

// Timeout durations
const WARN_AFTER_MS = 30_000   // Show "taking long" hint at 30s
const ABORT_AFTER_MS = 90_000  // Auto-dismiss with error at 90s

const stepConfig = {
  validate: {
    label: 'Validating Article',
    icon: '🔍',
    description: 'Checking article format and content...',
  },
  extract: {
    label: 'Extracting Content',
    icon: '📝',
    description: 'Reading and parsing article text...',
  },
  generate: {
    label: 'Crafting Your Game',
    icon: '🎮',
    description: 'AI is weaving your narrative...',
  },
  save: {
    label: 'Finalizing',
    icon: '💾',
    description: 'Saving your game to the arcade...',
  },
} as const

const CONTEXTUAL_TIPS = [
  {
    icon: <Lightbulb className="w-5 h-5 text-yellow-400" />,
    title: 'Did you know?',
    text: 'WritersArcade uses specialized AI models to maintain consistency across characters and styles in your story.',
  },
  {
    icon: <BookOpen className="w-5 h-5 text-blue-400" />,
    title: 'Author Trivia',
    text: 'Paragraph.xyz authors can earn rewards when users play games inspired by their articles.',
  },
  {
    icon: <Quote className="w-5 h-5 text-purple-400" />,
    title: 'Writing Tip',
    text: 'Great interactive stories often give users 3 distinct choices: one safe, one risky, and one mysterious.',
  },
  {
    icon: <Sparkles className="w-5 h-5 text-pink-400" />,
    title: 'Pro Tip',
    text: 'You can mint your finished comic as an NFT to preserve your unique playthrough forever.',
  },
]

export function GameGenerationOverlay({
  isOpen,
  currentStep,
  stepStatuses,
  genre = 'story',
  difficulty = 'easy',
  onCancel,
}: GameGenerationOverlayProps) {
  const steps = ['validate', 'extract', 'generate', 'save'] as const
  const currentStepIndex = currentStep ? steps.indexOf(currentStep) : -1
  const progress = currentStep ? ((currentStepIndex + 1) / steps.length) * 100 : 0

  const [showSlowHint, setShowSlowHint] = useState(false)
  const [tipIndex, setTipIndex] = useState(0)
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Memoize background particles with seeded random to avoid impure function calls during render
  const backgroundParticles = useMemo(() => {
    let seed = 67890
    const seededRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    return [...Array(20)].map((_, i) => ({
      id: i,
      initialX: seededRandom() * window.innerWidth,
      initialY: seededRandom() * window.innerHeight,
      animateY: seededRandom() * window.innerHeight,
      duration: 3 + seededRandom() * 2,
    }))
  }, [])

  // Rotate tips every 8 seconds
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % CONTEXTUAL_TIPS.length)
      }, 8000)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  // Start timers when overlay opens, clear them when it closes
  useEffect(() => {
    if (isOpen) {
      setShowSlowHint(false)
      warnTimerRef.current = setTimeout(() => setShowSlowHint(true), WARN_AFTER_MS)
      abortTimerRef.current = setTimeout(() => {
        onCancel?.()
      }, ABORT_AFTER_MS)
    } else {
      setShowSlowHint(false)
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
      if (abortTimerRef.current) clearTimeout(abortTimerRef.current)
    }
    return () => {
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
      if (abortTimerRef.current) clearTimeout(abortTimerRef.current)
    }
  }, [isOpen, onCancel])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {backgroundParticles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-1 h-1 bg-purple-500/30 rounded-full"
                initial={{
                  x: particle.initialX,
                  y: particle.initialY,
                }}
                animate={{
                  y: [null, particle.animateY],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: particle.duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Main content */}
          <motion.div
            className="relative z-10 w-full max-w-2xl mx-4 px-6 sm:px-8 py-8 sm:py-12 bg-gradient-to-br from-purple-950/90 via-indigo-950/90 to-purple-900/90 border-4 border-purple-500/50 rounded-2xl shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* Pulsing glow effect */}
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-50"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            <div className="relative space-y-8">
              {/* Header */}
              <div className="text-center space-y-4">
                <motion.div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-600/30 border-4 border-purple-500"
                  animate={{
                    rotate: 360,
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                    scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                  }}
                >
                  <Gamepad2 className="w-10 h-10 text-purple-200" />
                </motion.div>

                <div>
                  <motion.h2
                    className="text-3xl md:text-4xl font-bold text-white mb-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    🎮 Generating Your Game
                  </motion.h2>
                  <motion.p
                    className="text-lg text-purple-200"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Building a {genre} adventure • {difficulty} difficulty
                  </motion.p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-3">
                <ProgressBar value={progress} label="Overall Progress" percent />
                <p className="text-sm text-center text-purple-300">
                  {progress.toFixed(0)}% complete • This takes 30-60 seconds
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const status = stepStatuses[step]
                  const config = stepConfig[step]
                  const isActive = currentStep === step

                  return (
                    <motion.div
                      key={step}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        status === 'completed'
                          ? 'bg-green-900/20 border-green-500/50'
                          : status === 'error'
                          ? 'bg-red-900/20 border-red-500/50'
                          : isActive
                          ? 'bg-purple-900/40 border-purple-400'
                          : 'bg-gray-900/20 border-gray-700'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon/Status indicator */}
                        <motion.div
                          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 ${
                            status === 'completed'
                              ? 'bg-green-600/30 border-green-500'
                              : status === 'error'
                              ? 'bg-red-600/30 border-red-500'
                              : isActive
                              ? 'bg-purple-600/30 border-purple-400'
                              : 'bg-gray-700/30 border-gray-600'
                          }`}
                          animate={
                            isActive
                              ? {
                                  scale: [1, 1.1, 1],
                                  rotate: [0, 5, -5, 0],
                                }
                              : {}
                          }
                          transition={
                            isActive
                              ? {
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                }
                              : {}
                          }
                        >
                          {status === 'completed' ? (
                            <span className="text-green-300">✓</span>
                          ) : status === 'error' ? (
                            <span className="text-red-300">✕</span>
                          ) : isActive ? (
                            <Loader2 className="w-6 h-6 text-purple-300 animate-spin" />
                          ) : (
                            config.icon
                          )}
                        </motion.div>

                        {/* Step info */}
                        <div className="flex-1">
                          <h3
                            className={`font-semibold text-lg mb-1 ${
                              isActive ? 'text-purple-200' : 'text-gray-300'
                            }`}
                          >
                            {config.label}
                          </h3>
                          <p
                            className={`text-sm ${
                              isActive ? 'text-purple-300' : 'text-gray-400'
                            }`}
                          >
                            {config.description}
                          </p>
                        </div>

                        {/* Step number */}
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${
                            status === 'completed'
                              ? 'bg-green-600/20 border-green-500 text-green-300'
                              : isActive
                              ? 'bg-purple-600/20 border-purple-400 text-purple-200'
                              : 'bg-gray-700/20 border-gray-600 text-gray-400'
                          }`}
                        >
                          {index + 1}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Fun messages & Contextual Tips */}
              <div className="relative h-24 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tipIndex}
                    className="absolute inset-0 p-4 rounded-xl bg-purple-900/30 border border-purple-500/30"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {CONTEXTUAL_TIPS[tipIndex].icon}
                      </div>
                      <div className="text-sm text-purple-100 space-y-1">
                        <p className="font-semibold">{CONTEXTUAL_TIPS[tipIndex].title}</p>
                        <p className="text-purple-200/80 leading-relaxed">
                          {CONTEXTUAL_TIPS[tipIndex].text}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Slow hint + cancel */}
              {showSlowHint && (
                <motion.div
                  className="p-3 rounded-lg bg-amber-900/30 border border-amber-500/40 text-sm text-amber-200 flex items-center gap-2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span>⏳</span>
                  <span className="flex-1">Taking longer than expected. Try a shorter article or check your connection.</span>
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      className="shrink-0 px-3 py-1 rounded-md bg-amber-700/60 hover:bg-amber-600/80 text-amber-100 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  )}
                </motion.div>
              )}

              {/* Bottom row: dots + cancel link */}
              <div className="flex items-center justify-between pt-2">
                <motion.div
                  className="flex gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 rounded-full bg-purple-500"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </motion.div>
                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label="Cancel game generation"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
