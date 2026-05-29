'use client'

import { useAccount } from 'wagmi'
import { SecretPanel } from './secret-panel'
import { HypercertBadge } from './hypercert-badge'

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
 * Renders the Story CDR secret panel + Hypercerts badge
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

  const showSecretPanel = secretPanelGenerated
  const showHypercert = !!hypercertUri

  if (!showSecretPanel && !showHypercert) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
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
