'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, ChevronRight, Lightbulb, BookOpen, Coins, Layers, GitFork } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  
  const steps = [
    {
      title: "Turn articles into games",
      description: "Paste a Paragraph.xyz article URL — AI transforms it into an interactive comic you can play.",
      visual: <BookOpen className="w-12 h-12 text-blue-400" />,
      content: "Choose genre and difficulty to shape the narrative.",
      tip: "Start with short articles for the best results"
    },
    {
      title: "Two ways to pay",
      description: "Use a writer's coin on Base for the curated arcade, or MUSD on Mezo to remix any article.",
      visual: <GitFork className="w-12 h-12 text-amber-400" />,
      content: "Connect any Ethereum/Base wallet for writer coins, or a Bitcoin wallet (Xverse, Unisat, OKX) via Mezo Passport for MUSD. MEZO holders earn a payment boost.",
      tip: "Pick your path on the home page — switch any time"
    },
    {
      title: "Play, customize, and own",
      description: "Experience your unique 5-panel comic story. Regenerate images, edit text, and personalize every detail.",
      visual: <Layers className="w-12 h-12 text-purple-400" />,
      content: "Every game is unique. Your choices shape the story — play it multiple times for different outcomes.",
      tip: "Use the Workshop for deeper customization before generating"
    },
    {
      title: "Mint as on-chain IP",
      description: "Mint as an NFT on Base. Revenue splits are enforced on-chain — writers earn every time.",
      visual: <Coins className="w-12 h-12 text-emerald-400" />,
      content: "Register your creation as IP on Story Protocol. Derivatives earn royalties for the original creator.",
      tip: null
    },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  const handleSkip = () => {
    onClose()
  }

  if (!isOpen) return null

  const step = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">
            Getting Started
          </h2>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Visual */}
          <div className="text-center">
            <div className="text-6xl mb-4">{step.visual}</div>
            <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
            <p className="text-gray-300 text-sm">{step.description}</p>
          </div>

          {/* Content Details */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
            <p className="text-gray-200 text-sm">{step.content}</p>
            
            {/* Pro Tip with micro-interaction */}
            {step.tip && (
              <motion.div
                className="p-3 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 flex items-start gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-400" />
                <span>{step.tip}</span>
              </motion.div>
            )}
          </div>

          {/* Progress Bar */}
          <ProgressBar
            value={progress}
            label={`Step ${currentStep + 1} of ${steps.length}`}
            percent
          />
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-800">
          {currentStep >= 2 && (
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-800"
            >
              Skip
            </Button>
          )}
          <Button
            onClick={handleNext}
            className={`${currentStep >= 2 ? 'flex-1' : 'w-full'} bg-blue-600 text-white hover:bg-blue-500 border border-blue-500 flex items-center justify-center gap-2`}
          >
            {currentStep === steps.length - 1 ? 'Start' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Dots Navigation */}
        <div className="flex justify-center gap-2 pb-4">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentStep ? 'bg-white w-6' : 'bg-gray-700'
              }`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
