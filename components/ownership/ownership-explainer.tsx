'use client'

import { BadgeCheck, Network, Coins, ArrowRight } from 'lucide-react'

/**
 * Ownership-explained primer: connects Mint → IP → Royalties in one place.
 *
 * Full variant renders three benefit-led cards (learn page). Compact variant
 * renders a horizontal strip (finale disclosure, where the money decision
 * happens). Copy stays at two sentences per step — see docs/UX_PRINCIPLES.md.
 */

const STEPS = [
  {
    icon: BadgeCheck,
    step: '1',
    title: 'Mint',
    headline: 'Own the game as an NFT',
    body: 'Mint on Base to own a verifiable collectible of your story — and unlock the secret epilogue.',
  },
  {
    icon: Network,
    step: '2',
    title: 'Register as IP',
    headline: 'Make it provably yours',
    body: 'Optional: register on Story Protocol so ownership and license terms live on-chain.',
  },
  {
    icon: Coins,
    step: '3',
    title: 'Earn royalties',
    headline: 'Get paid for remixes',
    body: 'Every derivative and remix routes a share into your writer royalty pool. Claim anytime from your dashboard.',
  },
] as const

interface OwnershipExplainerProps {
  variant?: 'full' | 'compact'
  className?: string
}

export function OwnershipExplainer({ variant = 'full', className = '' }: OwnershipExplainerProps) {
  if (variant === 'compact') {
    return (
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-stretch ${className}`}>
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={step.step} className="flex flex-1 items-center gap-3">
              <div className="flex flex-1 items-start gap-3 rounded-lg border border-border bg-card/60 p-3">
                <div className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    <span className="text-muted-foreground">{step.step} ·</span> {step.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{step.body}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 sm:mx-1" aria-hidden />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <section className={className} aria-labelledby="ownership-explainer-title">
      <p
        id="ownership-explainer-title"
        className="text-sm font-semibold uppercase tracking-widest text-foreground mb-1"
      >
        How ownership works
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-2xl">
        Mint, register, and earn — in that order, and only when you want to. Every step is optional.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div
              key={step.step}
              className="relative rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <span className="text-2xl font-black text-muted-foreground/20">{step.step}</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{step.title}</p>
              <h3 className="mt-1 text-base font-semibold text-foreground">{step.headline}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground/40 sm:block" aria-hidden />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
