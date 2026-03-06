'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, ChevronRight, Lightbulb, Check, PenLine, BookOpen, Coins, Layers } from 'lucide-react'
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
      title: "Welcome to writersarcade",
      description: "Turn any article into an interactive, mintable game powered by AI",
      visual: <PenLine className="w-12 h-12 text-slate-300" />,
      content: "Interactive fiction, owned onchain. Writers earn from reader creativity.",
      tip: "Start with short articles for the best results"
    },
    {
      title: "Step 1: Choose Your Content",
      description: "Paste a Paragraph.xyz article URL or describe your game idea",
      visual: <BookOpen className="w-12 h-12 text-blue-400" />,
      content: "Works exclusively with Paragraph.xyz articles from supported authors",
      tip: "Check the supported authors list in the FAQ"
    },
    {
      title: "Step 2: Customize (Optional)",
      description: "Pick your game style: Horror? Comedy? Mystery?",
      visual: <Layers className="w-12 h-12 text-slate-300" />,
      content: "Choose a genre and difficulty level to shape how the AI interprets the article.",
      tip: "Higher difficulty produces more complex gameplay"
    },
    {
      title: "Step 3: Play Your Game",
      description: "Experience your unique AI-generated game interpretation",
      visual: <Lightbulb className="w-12 h-12 text-yellow-400" />,
      content: "Every game is unique based on your input and customization",
      tip: "Your choices shape the story - play multiple times!"
    },
    {
      title: "Step 4: Mint as NFT",
      description: "Own your creation and earn from future plays",
      visual: <Coins className="w-12 h-12 text-amber-400" />,
      content: "Mint your game as an NFT. Revenue is split on-chain between you, the writer, and the platform.",
      tip: "Every mint includes full attribution to the original article and author"
    },
    {
      title: "You're Ready!",
      description: "Start creating your first game now",
      visual: <Check className="w-12 h-12 text-green-400" />,
      content: "Click 'Create Game' to begin your journey",
      tip: "Need help? Click the ? icon anytime"
    }
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
          <Button
            variant="outline"
            onClick={handleSkip}
            className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-800"
          >
            Skip
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 bg-white text-black hover:bg-gray-100 flex items-center justify-center gap-2"
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
