'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Coins, Link as LinkIcon, Settings, Play, Sparkles } from 'lucide-react'

export type GenerateStep = 'article' | 'customize' | 'payment' | 'generate'

export const GENERATE_STEPS: { id: GenerateStep; icon: typeof Sparkles; label: string; desktopLabel: string }[] = [
  { id: 'article',    icon: LinkIcon,  label: 'Article',   desktopLabel: '1. Paste article' },
  { id: 'customize',  icon: Settings,  label: 'Style',     desktopLabel: '2. Customize' },
  { id: 'payment',    icon: Coins,     label: 'Payment',   desktopLabel: '3. Pay & generate' },
  { id: 'generate',   icon: Play,      label: 'Launch',    desktopLabel: '4. Launch' },
]

export function getStepIndex(step: GenerateStep): number {
  return GENERATE_STEPS.findIndex(s => s.id === step)
}

/**
 * Desktop phase indicator — shows current step and progress dots.
 * Only visible on md+ screens.
 */
export function DesktopStepIndicator({ currentStep }: { currentStep: GenerateStep }) {
  return (
    <div className="hidden md:flex items-center justify-between px-2 mb-8">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
          Phase {getStepIndex(currentStep) + 1} of {GENERATE_STEPS.length}
        </span>
        <h2 className="text-lg font-bold text-foreground">
          {GENERATE_STEPS.find(s => s.id === currentStep)?.desktopLabel}
        </h2>
      </div>
      <div className="flex space-x-1.5">
        {GENERATE_STEPS.map((step, idx) => {
          const currentIdx = getStepIndex(currentStep)
          return (
            <div
              key={step.id}
              className={`h-1.5 w-6 rounded-full transition-all duration-500 ${
                idx === currentIdx
                  ? 'w-10 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]'
                  : idx < currentIdx
                  ? 'bg-green-500/60'
                  : 'bg-white/10'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}

/**
 * Mobile step indicator — sticky top bar showing current step name.
 * Only visible on small screens.
 */
export function MobileStepHeader({ currentStep }: { currentStep: GenerateStep }) {
  const stepInfo = GENERATE_STEPS.find(s => s.id === currentStep)
  if (!stepInfo) return null

  const Icon = stepInfo.icon
  const currentIdx = getStepIndex(currentStep)

  return (
    <div className="md:hidden mb-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600/20 border border-purple-500/30">
          <Icon className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
            Step {currentIdx + 1} of {GENERATE_STEPS.length}
          </p>
          <p className="text-sm font-semibold text-foreground">{stepInfo.label}</p>
        </div>
      </div>
      <div className="flex space-x-1.5">
        {GENERATE_STEPS.map((step, idx) => (
          <div
            key={step.id}
            className={`h-1 rounded-full transition-all duration-500 flex-1 ${
              idx === currentIdx
                ? 'bg-purple-500'
                : idx < currentIdx
                ? 'bg-green-500/60'
                : 'bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Mobile bottom nav — persistent bar with back button and step dots.
 * Only visible on small screens.
 */
export function MobileStepNav({
  currentStep,
  canGoBack,
  onBack,
}: {
  currentStep: GenerateStep
  canGoBack: boolean
  onBack: () => void
}) {
  const currentIdx = getStepIndex(currentStep)

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100]">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl border-t border-border" />
      <div className="relative flex items-center justify-between px-6 py-4">
        {/* Back Button */}
        <div className="flex-1">
          {canGoBack && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted border border-border text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={3} />
            </motion.button>
          )}
        </div>

        {/* Step Dots */}
        <div className="flex flex-[2] items-center justify-center space-x-3">
          {GENERATE_STEPS.map((step, idx) => (
            <div key={step.id} className="relative flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300 ${
                  idx === currentIdx
                    ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-110'
                    : idx < currentIdx
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-muted text-muted-foreground/30'
                }`}
              >
                <step.icon className="h-3.5 w-3.5" />
              </div>
              {idx === currentIdx && (
                <motion.span
                  layoutId="mobileStepLabel"
                  className="absolute -bottom-4 text-[8px] font-bold uppercase tracking-widest text-purple-400 whitespace-nowrap"
                >
                  {step.label}
                </motion.span>
              )}
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  )
}
