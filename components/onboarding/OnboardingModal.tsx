'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Wand2, Gamepad2, Coins, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      icon: Wand2,
      title: 'Paste an article, get a game',
      description:
        'Drop any Paragraph.xyz article URL into the form. AI reads it and generates a unique 5-panel interactive comic you can play.',
      tip: 'Start with short articles for the best results.',
    },
    {
      icon: Gamepad2,
      title: 'Play and customise',
      description:
        'Make choices that shape the story. Regenerate panels, edit text, and tweak the genre and difficulty to your liking.',
      tip: null,
    },
    {
      icon: Coins,
      title: 'Own what you create',
      description:
        'Mint your game as an NFT. Register as IP on Story Protocol — your works are pooled into a royalty group so you earn automatically every time.',
      tip: 'You can play for free with Wordle — no wallet needed.',
    },
    {
      icon: ShieldCheck,
      title: 'Your royalty pool',
      description:
        'Every IP you register joins your writer royalty pool. When derivatives earn revenue, royalties flow into the pool and are distributed evenly across all your games.',
      tip: 'Claim anytime from your creator dashboard.',
    },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  const step = steps[currentStep]
  const Icon = step.icon
  const isLast = currentStep === steps.length - 1

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl max-w-sm w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Welcome
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close onboarding"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-center">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center mx-auto">
              <Icon className="w-6 h-6 text-primary" />
            </div>

            <h3 className="text-xl font-bold text-card-foreground">
              {step.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>

            {step.tip && (
              <p className="text-xs text-muted-foreground bg-muted border border-border rounded-lg p-3 leading-relaxed">
                {step.tip}
              </p>
            )}
          </motion.div>

          {/* Dots */}
          <div className="flex justify-center gap-2 pt-2">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'bg-foreground w-6'
                    : 'bg-muted-foreground/30'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-border">
          {!isLast && (
            <Button variant="outline" onClick={onClose} className="flex-1">
              Skip
            </Button>
          )}
          <Button
            onClick={handleNext}
            className={`${isLast ? 'w-full' : 'flex-1'} flex items-center justify-center gap-2`}
          >
            {isLast ? 'Get started' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}
