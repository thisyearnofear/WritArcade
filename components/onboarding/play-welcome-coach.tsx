'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gamepad2, LockKeyhole, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConceptTerm } from '@/lib/concept-definitions'
import { isOnboardingDismissed } from '@/hooks/useOnboarding'

const STORAGE_KEY = 'writersarcade:play-welcome-dismissed'

interface PlayWelcomeCoachProps {
  gameSlug: string
}

export function PlayWelcomeCoach({ gameSlug }: PlayWelcomeCoachProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [onboardingDone, setOnboardingDone] = useState(false)

  useEffect(() => {
    setOnboardingDone(isOnboardingDismissed())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('welcome') !== '1') return

    const dismissed = sessionStorage.getItem(`${STORAGE_KEY}:${gameSlug}`)
    if (!dismissed) setOpen(true)

    params.delete('welcome')
    const next = params.toString()
    const url = next ? `${window.location.pathname}?${next}` : window.location.pathname
    window.history.replaceState({}, '', url)
  }, [gameSlug])

  const fullSteps = [
    {
      icon: Gamepad2,
      title: 'Make 5 choices',
      body: 'Each panel branches the story. Your path is unique to this playthrough.',
    },
    {
      icon: LockKeyhole,
      title: 'Secret epilogue (after mint)',
      body: (
        <>
          Finish all 5 panels, then{' '}
          <ConceptTerm concept="mint">
            <span className="underline decoration-dotted underline-offset-2 cursor-help">mint the NFT</span>
          </ConceptTerm>{' '}
          to decrypt the bonus ending on Base. You will see a checklist during play.
        </>
      ),
    },
    {
      icon: Coins,
      title: 'Mint when you are ready',
      body: 'Minting is optional until you want to own the game or unlock the epilogue. Writers earn automatically when you do.',
    },
  ]

  const shortSteps = [
    {
      icon: Gamepad2,
      title: 'Your story starts now',
      body: 'Make 5 choices — one per panel. Watch the progress bar and epilogue checklist as you go.',
    },
    {
      icon: LockKeyhole,
      title: 'Epilogue needs mint',
      body: 'Finish all panels, then mint the game NFT to decrypt the secret epilogue. Optional until you are ready.',
    },
  ]

  const steps = onboardingDone ? shortSteps : fullSteps

  const dismiss = () => {
    sessionStorage.setItem(`${STORAGE_KEY}:${gameSlug}`, '1')
    setOpen(false)
  }

  if (!open) return null

  const current = steps[step]
  const Icon = current.icon
  const isLast = step === steps.length - 1

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your game is ready · {step + 1}/{steps.length}
            </p>
            <button type="button" onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <Icon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
          </div>

          <div className="flex gap-2 border-t border-border p-4">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <Button
              className="flex-1 bg-purple-600 hover:bg-purple-500"
              onClick={() => (isLast ? dismiss() : setStep(step + 1))}
            >
              {isLast ? 'Start playing' : 'Next'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
