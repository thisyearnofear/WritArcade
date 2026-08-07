'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Wand2, Gamepad2, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDialogA11y } from '@/hooks/use-dialog-a11y'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)

  // Three steps only. The secret-epilogue and daily-challenge concepts are
  // taught in-context (in-game coach, ConceptTooltip, nav) rather than
  // explained twice up front — see docs/UX_PRINCIPLES.md.
  const steps = [
    {
      icon: Gamepad2,
      title: 'Play first, no wallet needed',
      description:
        'Paste any Paragraph.xyz article URL and play a free 5-panel interactive comic or Wordle. No wallet, no payment, no signup required.',
      tip: 'Try the free Wordle mode for zero-friction fun.',
    },
    {
      icon: Wand2,
      title: 'Create your own game',
      description:
        'Turn any article or piece of marketing copy into a playable story in seconds. AI reads the source and builds choices, visuals, and a finale.',
      tip: null,
    },
    {
      icon: Coins,
      title: 'Own and earn',
      description:
        'Ready to go deeper? Connect a wallet to mint your game as an NFT, register it as IP on Story Protocol, and earn from every play.',
      tip: 'Wallet connection is only required for on-chain actions — gameplay is free.',
    },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  const { dialogRef, handleBackdropClick } = useDialogA11y(isOpen, onClose, { closeOnBackdrop: true })

  if (!isOpen) return null

  const step = steps[currentStep]
  const Icon = step.icon
  const isLast = currentStep === steps.length - 1

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      aria-hidden={!isOpen}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl max-w-sm w-full shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 id="onboarding-title" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
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

            <h3 className="text-xl font-bold text-card-foreground">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

            {step.tip && (
              <p className="text-xs text-muted-foreground bg-muted border border-border rounded-lg p-3 leading-relaxed">
                {step.tip}
              </p>
            )}
          </motion.div>

          <div className="flex justify-center gap-2 pt-2">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStep ? 'bg-foreground w-6' : 'bg-muted-foreground/30'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-border">
          {!isLast && (
            <Button variant="outline" onClick={onClose} className="flex-1">
              Skip
            </Button>
          )}
          <Button onClick={handleNext} className={`${isLast ? 'w-full' : 'flex-1'} flex items-center justify-center gap-2`}>
            {isLast ? 'Get started' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}
