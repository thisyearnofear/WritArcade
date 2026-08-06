'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { SecretPanel } from './secret-panel'
import { HypercertBadge } from './hypercert-badge'
import { ModifierReveal } from './modifier-reveal'
import {
  loadDailyChallengeState,
  type DailyChallengeClientState,
} from '@/lib/daily-challenge-client'
import { config } from '@/lib/config'

interface GameEnrichmentProps {
  gameId: string
  gameSlug: string
  primaryColor: string
  nftTokenId?: string | null
  secretPanelGenerated?: boolean
  promptVaultUuid?: string | null
  hypercertUri?: string | null
  hypercertCid?: string | null
  storySessionId?: string | null
  storyComplete?: boolean
}

/**
 * Renders the Inco secret panel + Hypercerts badge
 * below the main game interface. Client-only — uses wagmi for wallet state.
 */
export function GameEnrichment({
  gameId,
  gameSlug,
  primaryColor,
  nftTokenId,
  secretPanelGenerated,
  promptVaultUuid,
  hypercertUri,
  hypercertCid,
  storySessionId,
  storyComplete,
}: GameEnrichmentProps) {
  const { address, isConnected } = useAccount()
  const [dailyState, setDailyState] = useState<DailyChallengeClientState | null>(null)

  useEffect(() => {
    if (config.features.dailyChallenge) {
      setDailyState(loadDailyChallengeState())
    }
  }, [storyComplete])

  const showSecretPanel = secretPanelGenerated
  const showHypercert = !!hypercertUri
  const showDailyReveal = Boolean(dailyState?.incoSessionId)

  if (!showSecretPanel && !showHypercert && !showDailyReveal) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {showDailyReveal && dailyState && !storyComplete && (
        <div className="rounded-lg border border-purple-500/25 bg-purple-950/20 px-4 py-3 text-sm text-purple-100">
          <p className="font-semibold text-purple-300">Daily Challenge active</p>
          <p className="mt-1 text-purple-100/80 text-xs">
            A hidden modifier card is shaping each panel. Your score unlocks at the finale.
          </p>
        </div>
      )}

      {showDailyReveal && dailyState && (
        <ModifierReveal
          gameId={gameId}
          sessionId={dailyState.incoSessionId}
          vaultAddress={dailyState.vaultAddress}
          modifierHandles={dailyState.modifierHandles}
          scoreHandle={dailyState.scoreHandle}
          isComplete={!!storyComplete}
          primaryColor={primaryColor}
        />
      )}

      {showSecretPanel && (
        <SecretPanel
          gameId={gameId}
          gameSlug={gameSlug}
          primaryColor={primaryColor}
          promptVaultUuid={promptVaultUuid}
          isConnected={isConnected}
          walletAddress={address}
          nftTokenId={nftTokenId}
          storySessionId={storySessionId}
          storyComplete={storyComplete}
        />
      )}

      {showHypercert && (
        <div className="flex justify-center">
          <HypercertBadge
            hypercertUri={hypercertUri}
            _hypercertCid={hypercertCid}
          />
        </div>
      )}
    </div>
  )
}
