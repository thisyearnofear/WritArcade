'use client'

import { BadgeCheck, Coins, FileText, LockKeyhole, Network, Play } from 'lucide-react'
import type { ComponentType } from 'react'
import { Game } from '../types'
import { getSecretPanelStatus, formatSecretPanelDetail } from '@/lib/secret-panel-status'
import { getGameProgress } from '@/lib/game-progress'

interface GameOwnershipProgressProps {
  game: Game
  variant?: 'full' | 'compact' | 'strip'
}

type StepState = 'complete' | 'current' | 'pending'

interface LifecycleStep {
  id: string
  label: string
  detail: string
  state: StepState
  icon: ComponentType<{ className?: string }>
}

function getPaymentLabel(game: Game) {
  if (game.writerCoinId?.toLowerCase().startsWith('musd')) return 'MUSD on Mezo'
  if (game.writerCoinId) return 'Writer coin on Base'
  return 'Base creation'
}

function getLifecycleSteps(game: Game): LifecycleStep[] {
  const progress = getGameProgress(game)
  const secret = progress.secretStatus
  const minted = Boolean(game.nftTransactionHash || game.nftTokenId)
  const registered = Boolean(game.storyIpId)
  const played = progress.playCount > 0

  const steps: Omit<LifecycleStep, 'state'>[] = [
    {
      id: 'source',
      label: 'Source',
      detail: game.articleUrl ? 'Article-linked game' : 'Prompt-origin game',
      icon: FileText,
    },
    {
      id: 'play',
      label: 'Play',
      detail: played ? 'Story started or completed' : 'Make your 5 panel choices',
      icon: Play,
    },
    {
      id: 'payment',
      label: 'Paid',
      detail: getPaymentLabel(game),
      icon: Coins,
    },
    {
      id: 'mint',
      label: 'Mint',
      detail: minted ? 'NFT minted on Base' : 'Mint when ready to own',
      icon: BadgeCheck,
    },
    {
      id: 'story',
      label: 'Story IP',
      detail: registered ? 'Registered on Story Protocol' : 'Optional IP registration',
      icon: Network,
    },
    {
      id: 'secret',
      label: 'Secret',
      detail: formatSecretPanelDetail(secret),
      icon: LockKeyhole,
    },
  ]

  const completedIds = new Set<string>(['source', 'payment'])
  if (played) completedIds.add('play')
  if (minted) completedIds.add('mint')
  if (registered) completedIds.add('story')
  if (secret.kind === 'inco' || secret.kind === 'legacy') completedIds.add('secret')

  let currentId: string | null = null
  if (!played) currentId = 'play'
  else if (!minted) currentId = 'mint'
  else if (secret.kind === 'pending' || secret.kind === 'none') currentId = 'secret'
  else if (!registered) currentId = 'story'

  return steps.map((step) => {
    let state: StepState = 'pending'
    if (completedIds.has(step.id)) state = 'complete'
    else if (step.id === currentId) state = 'current'
    return { ...step, state }
  })
}

export function GameOwnershipProgress({ game, variant = 'full' }: GameOwnershipProgressProps) {
  const steps = getLifecycleSteps(game)
  const progress = getGameProgress(game)

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap gap-1.5">
        <span
          className="inline-flex h-6 items-center rounded border border-purple-500/30 bg-purple-500/10 px-1.5 text-[11px] font-medium text-purple-700 dark:text-purple-300"
          title={progress.nextStepLabel ?? progress.chipLabel}
        >
          {progress.chipLabel}
        </span>
        {steps
          .filter((s) => ['mint', 'story', 'secret'].includes(s.id))
          .map((step) => {
            const Icon = step.icon
            return (
              <span
                key={step.id}
                className={`inline-flex h-6 items-center gap-1 rounded border px-1.5 text-[11px] font-medium ${
                  step.state === 'complete'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : step.state === 'current'
                      ? 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                      : 'border-border bg-muted text-muted-foreground'
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

  if (variant === 'strip') {
    const ordered = ['play', 'secret', 'mint', 'story'] as const
    const stripSteps = ordered
      .map((id) => steps.find((s) => s.id === id))
      .filter(Boolean) as LifecycleStep[]

    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {stripSteps.map((step, i) => {
          const Icon = step.icon
          return (
            <span key={step.id} className="inline-flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">→</span>}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                  step.state === 'complete'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : step.state === 'current'
                      ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-3 w-3" />
                {step.label}
              </span>
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Your progress</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Play first, then mint and unlock the <span className="text-foreground">secret epilogue</span>.
        </p>
        {progress.nextStepLabel && (
          <p className="mt-2 text-sm font-medium text-purple-600 dark:text-purple-400">
            Next: {progress.nextStepLabel}
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <div
              key={step.id}
              className={`rounded-md border p-3 ${
                step.state === 'complete'
                  ? 'border-emerald-500/25 bg-emerald-500/[0.08]'
                  : step.state === 'current'
                    ? 'border-purple-500/30 bg-purple-500/[0.08]'
                    : 'border-border bg-muted/30'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <Icon
                  className={
                    step.state === 'complete'
                      ? 'h-4 w-4 text-emerald-600 dark:text-emerald-300'
                      : step.state === 'current'
                        ? 'h-4 w-4 text-purple-600 dark:text-purple-300'
                        : 'h-4 w-4 text-muted-foreground'
                  }
                />
              </div>
              <div className="text-xs font-semibold uppercase text-foreground">{step.label}</div>
              <div className="mt-1 text-xs leading-snug text-muted-foreground">{step.detail}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** @deprecated Use GameOwnershipProgress */
export { GameOwnershipProgress as ProtocolLifecycle }
