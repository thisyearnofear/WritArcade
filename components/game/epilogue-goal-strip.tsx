'use client'

import { CheckCircle2, Circle, LockKeyhole } from 'lucide-react'

interface EpilogueGoalStripProps {
  panelsDone: number
  maxPanels?: number
  hasSecretEpilogue: boolean
  hasMintedNft: boolean
  primaryColor?: string
}

/**
 * Always-visible play goals: panel progress + secret epilogue requirements.
 */
export function EpilogueGoalStrip({
  panelsDone,
  maxPanels = 5,
  hasSecretEpilogue,
  hasMintedNft,
  primaryColor = '#8b5cf6',
}: EpilogueGoalStripProps) {
  if (!hasSecretEpilogue) return null

  const panelsComplete = panelsDone >= maxPanels
  const color = primaryColor

  return (
    <div className="w-full max-w-5xl mb-4 rounded-lg border border-white/10 bg-black/40 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <LockKeyhole className="w-4 h-4" style={{ color }} />
          <span className="text-xs font-bold uppercase tracking-wider text-white">Secret epilogue</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <GoalItem done={panelsComplete} label={`Finish ${maxPanels} panels`} />
          <GoalItem done={hasMintedNft} label="Mint game NFT" />
          <GoalItem done={panelsComplete && hasMintedNft} label="Decrypt on Base" muted={!panelsComplete || !hasMintedNft} />
        </div>
      </div>
      {!panelsComplete && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Play through the story first. Minting unlocks the encrypted bonus ending — optional until you are ready to own it.
        </p>
      )}
      {panelsComplete && !hasMintedNft && (
        <p className="mt-2 text-[11px]" style={{ color }}>
          Story complete. Mint from Ownership on your library card to decrypt the secret epilogue.
        </p>
      )}
    </div>
  )
}

function GoalItem({ done, label, muted }: { done: boolean; label: string; muted?: boolean }) {
  const Icon = done ? CheckCircle2 : Circle
  return (
    <span className={`inline-flex items-center gap-1.5 ${muted ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
      <Icon className={`w-3.5 h-3.5 ${done ? 'text-emerald-400' : ''}`} />
      {label}
    </span>
  )
}
