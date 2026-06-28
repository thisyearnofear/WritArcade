'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState, useMemo } from 'react'
import { Loader2, Sparkles, Gamepad2, X, Lightbulb, BookOpen, Quote } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'

type LoadingStep = 'payment' | 'validate' | 'extract' | 'generate' | 'save'
type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error'

interface GameGenerationOverlayProps {
  isOpen: boolean
  currentStep: LoadingStep | null
  stepStatuses: Record<LoadingStep, StepStatus>
  genre?: string
  difficulty?: string
  onCancel?: () => void
}

const ABORT_AFTER_MS = 90_000

const stepConfig = {
  payment: { label: 'Payment Verified', icon: '💳' },
  validate: { label: 'Validating Article', icon: '🔍' },
  extract: { label: 'Extracting Content', icon: '📝' },
  generate: { label: 'Crafting Your Game', icon: '🎮' },
  save: { label: 'Finalizing', icon: '💾' },
} as const

const CONTEXTUAL_TIPS = [
  {
    icon: <Lightbulb className="w-4 h-4 text-yellow-400" />,
    title: 'Did you know?',
    text: 'WritersArcade uses specialized AI models to maintain consistency across characters and styles in your story.',
  },
  {
    icon: <BookOpen className="w-4 h-4 text-blue-400" />,
    title: 'Author Trivia',
    text: 'Paragraph.xyz authors can earn rewards when users play games inspired by their articles.',
  },
  {
    icon: <Quote className="w-4 h-4 text-purple-400" />,
    title: 'Writing Tip',
    text: 'Great interactive stories often give users 3 distinct choices: one safe, one risky, and one mysterious.',
  },
  {
    icon: <Sparkles className="w-4 h-4 text-pink-400" />,
    title: 'Pro Tip',
    text: 'You can mint your finished comic as an NFT to preserve your unique playthrough forever.',
  },
]

const TIP_ROTATION_MS = 6_000

export function GameGenerationOverlay({
  isOpen,
  currentStep,
  stepStatuses,
  genre = 'story',
  difficulty = 'easy',
  onCancel,
}: GameGenerationOverlayProps) {
  const steps = ['payment', 'validate', 'extract', 'generate', 'save'] as const
  const currentStepIndex = currentStep ? steps.indexOf(currentStep) : -1
  const progress = currentStep ? ((currentStepIndex + 1) / steps.length) * 100 : 0

  const [tipIndex, setTipIndex] = useState(0)
  const abortTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const backgroundParticles = useMemo(() => {
    let seed = 67890
    const seededRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1920
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 1080
    return [...Array(12)].map((_, i) => ({
      id: i,
      initialX: seededRandom() * viewportW,
      initialY: seededRandom() * viewportH,
      animateY: seededRandom() * viewportH,
      duration: 3 + seededRandom() * 2,
    }))
  }, [])

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % CONTEXTUAL_TIPS.length)
      }, TIP_ROTATION_MS)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      abortTimerRef.current = setTimeout(() => onCancel?.(), ABORT_AFTER_MS)
    }
    return () => {
      if (abortTimerRef.current) clearTimeout(abortTimerRef.current)
    }
  }, [isOpen, onCancel])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {backgroundParticles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-1 h-1 bg-purple-500/30 rounded-full"
                initial={{ x: particle.initialX, y: particle.initialY }}
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

          <motion.div
            className="relative z-10 w-full max-w-lg mx-4 px-5 py-5 bg-gradient-to-br from-purple-950/90 via-indigo-950/90 to-purple-900/90 border border-purple-500/40 rounded-xl shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className="relative space-y-4">
              {/* Header */}
              <div className="text-center">
                <motion.div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-600/30 border-2 border-purple-500 mb-2"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <Gamepad2 className="w-7 h-7 text-purple-200" />
                </motion.div>
                <motion.h2
                  className="text-xl font-bold text-white"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Generating Your Game
                </motion.h2>
                <motion.p
                  className="text-sm text-purple-300"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {genre} • {difficulty}
                </motion.p>
              </div>

              {/* Progress bar */}
              <div>
                <ProgressBar value={progress} label="Progress" percent />
              </div>

              {/* Steps */}
              <div className="space-y-1.5">
                {steps.map((step, index) => {
                  const status = stepStatuses[step]
                  const config = stepConfig[step]
                  const isActive = currentStep === step

                  return (
                    <motion.div
                      key={step}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${
                        status === 'completed'
                          ? 'bg-green-900/15'
                          : status === 'error'
                          ? 'bg-red-900/15'
                          : isActive
                          ? 'bg-purple-900/30'
                          : 'opacity-40'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: isActive || status === 'completed' ? 1 : 0.4, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                    >
                      <span className="w-5 text-center text-sm">
                        {status === 'completed' ? (
                          <span className="text-green-400 font-bold">✓</span>
                        ) : status === 'error' ? (
                          <span className="text-red-400">✕</span>
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 text-purple-300 animate-spin mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">{config.icon}</span>
                        )}
                      </span>
                      <span className={`text-sm font-medium ${isActive ? 'text-purple-200' : 'text-muted-foreground'}`}>
                        {config.label}
                      </span>
                      <span className="ml-auto text-[11px] text-muted-foreground">{index + 1}/5</span>
                    </motion.div>
                  )
                })}
              </div>

              {/* Tips — rotating inline */}
              <div className="relative h-14 overflow-hidden rounded-lg bg-purple-900/20 border border-purple-500/20">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tipIndex}
                    className="absolute inset-0 flex items-center gap-2 px-3"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.4 }}
                  >
                    {CONTEXTUAL_TIPS[tipIndex].icon}
                    <div className="text-xs text-purple-200/80 leading-relaxed min-w-0">
                      <span className="font-semibold text-purple-100">{CONTEXTUAL_TIPS[tipIndex].title}:</span>{' '}
                      {CONTEXTUAL_TIPS[tipIndex].text}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Cancel link */}
              <div className="flex justify-center">
                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
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
