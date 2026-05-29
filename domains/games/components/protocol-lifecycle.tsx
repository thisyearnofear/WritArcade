'use client'

import { BadgeCheck, Coins, FileText, LockKeyhole, Network, ShieldCheck } from 'lucide-react'
import type { ComponentType } from 'react'
import { Game } from '../types'

interface ProtocolLifecycleProps {
  game: Game
  variant?: 'full' | 'compact'
}

type StepState = 'complete' | 'pending'

interface LifecycleStep {
  id: string
  label: string
  detail: string
  state: StepState
  icon: ComponentType<{ className?: string }>
}

function getPaymentLabel(game: Game) {
  if (game.writerCoinId?.toLowerCase().startsWith('musd')) {
    return 'MUSD on Mezo'
  }

  if (game.writerCoinId) {
    return 'Writer coin on Base'
  }

  return 'Base creation'
}

function getLifecycleSteps(game: Game): LifecycleStep[] {
  const minted = Boolean(game.nftTransactionHash || game.nftTokenId)
  const protectedByCdr = Boolean(game.promptVaultUuid || game.wordleAnswerVaultUuid)
  const registered = Boolean(game.storyIpId)

  return [
    {
      id: 'source',
      label: 'Source',
      detail: game.articleUrl ? 'Article-linked game' : 'Prompt-origin game',
      state: 'complete',
      icon: FileText,
    },
    {
      id: 'payment',
      label: 'Payment',
      detail: getPaymentLabel(game),
      state: 'complete',
      icon: Coins,
    },
    {
      id: 'mint',
      label: 'Mint',
      detail: minted ? 'NFT minted on Base' : 'Ready to mint on Base',
      state: minted ? 'complete' : 'pending',
      icon: BadgeCheck,
    },
    {
      id: 'story',
      label: 'Story IP',
      detail: registered ? 'Registered on Story Protocol' : 'Ready for IP registration',
      state: registered ? 'complete' : 'pending',
      icon: Network,
    },
    {
      id: 'cdr',
      label: 'CDR',
      detail: protectedByCdr ? 'Confidential unlock vaulted' : 'Vaulting pending',
      state: protectedByCdr ? 'complete' : 'pending',
      icon: LockKeyhole,
    },
  ]
}

export function ProtocolLifecycle({ game, variant = 'full' }: ProtocolLifecycleProps) {
  const steps = getLifecycleSteps(game)

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {steps.slice(2).map((step) => {
          const Icon = step.icon
          return (
            <span
              key={step.id}
              className={`inline-flex h-6 items-center gap-1 rounded border px-1.5 text-[11px] font-medium ${
                step.state === 'complete'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-border bg-muted/50 text-muted-foreground'
              }`}
              title={step.detail}
            >
              <Icon className="h-3 w-3" />
              {step.label}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-white shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/90">IP Lifecycle</h2>
          </div>
          <p className="mt-1 text-sm text-white/60">
            Pay to create, mint to own, register to protect, unlock to reveal.
          </p>
        </div>
        {game.storyIpId && (
          <span className="max-w-[11rem] truncate rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
            {game.storyIpId}
          </span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-5">
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <div
              key={step.id}
              className={`rounded-md border p-3 ${
                step.state === 'complete'
                  ? 'border-emerald-500/25 bg-emerald-500/[0.08]'
                  : 'border-white/10 bg-black/20'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <Icon className={step.state === 'complete' ? 'h-4 w-4 text-emerald-300' : 'h-4 w-4 text-white/45'} />
                <span
                  className={`h-2 w-2 rounded-full ${
                    step.state === 'complete' ? 'bg-emerald-400' : 'bg-white/25'
                  }`}
                  aria-hidden="true"
                />
              </div>
              <div className="text-xs font-semibold uppercase text-white/85">{step.label}</div>
              <div className="mt-1 text-xs leading-snug text-white/55">{step.detail}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
