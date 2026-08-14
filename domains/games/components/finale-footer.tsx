'use client'

import { Button } from '@/components/ui/button'
import { Download, Zap, Loader2, Wallet, BarChart3 } from 'lucide-react'
import { AttributionPair } from '@/components/ui/user-attribution'
import { NarrationControls } from './finale-narration'
import { VideoUpsellCTA } from './finale-video-screen'
import type { useVideoMotion } from './finale-video-motion'
import type { useNarration } from './finale-narration'
import type { ComicBookFinalePanelData } from './comic-book-finale'
import { DualSourceCredits } from '@/components/basepaint/dual-source-credits'
import { parseBasePaintDayFromSource } from '@/lib/basepaint/source-url'

interface FinaleFooterProps {
  genre: string
  totalPanels: number
  primaryColor: string
  creatorWallet: string
  authorParagraphUsername: string
  authorWallet?: string
  articleUrl: string
  panels: ComicBookFinalePanelData[]
  currentPanel?: ComicBookFinalePanelData
  currentPanelIndex: number
  narration: ReturnType<typeof useNarration>
  video: ReturnType<typeof useVideoMotion>
  isMinting: boolean
  mintAvailable: boolean
  onDownload: () => void
  onMint: () => void
  // Video upsell
  onOpenVideoStyleModal: () => void
  onWatchCinematic: () => void
  // Funding fallback
  onFundGame?: () => void
  onConnectWallet?: (() => void) | undefined
  isFunding?: boolean
  fundCostLabel?: string
  // IP registration
  ipRegistrationReady: boolean
  showIPRegistration: boolean
  onShowIPRegistration: () => void
  isOwner?: boolean
  gameSlug: string
  hasSecretEpilogue?: boolean
}

/**
 * Footer bar with attribution, narration controls, utility actions, and optional ownership.
 * Extracted from ComicBookFinale to reduce its size.
 */
export function FinaleFooter({
  genre,
  totalPanels,
  primaryColor,
  creatorWallet,
  authorParagraphUsername,
  authorWallet,
  articleUrl,
  panels,
  currentPanel,
  currentPanelIndex,
  narration,
  video,
  isMinting,
  mintAvailable,
  onDownload,
  onMint,
  onFundGame,
  onConnectWallet,
  isFunding,
  fundCostLabel,
  ipRegistrationReady,
  showIPRegistration,
  onShowIPRegistration,
  isOwner = false,
  gameSlug,
  hasSecretEpilogue = false,
  onOpenVideoStyleModal,
  onWatchCinematic,
}: FinaleFooterProps) {
  const basePaintDay = parseBasePaintDayFromSource(articleUrl)

  return (
    <div
      id="finale-mint-section"
      className="border-t border-white/10 p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-md"
      style={{ boxShadow: `0 -4px 20px ${primaryColor}10` }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
        {/* Attribution & Info */}
        <div className="space-y-3">
          <AttributionPair
            creatorWallet={creatorWallet}
            authorParagraphUsername={authorParagraphUsername}
            authorWallet={authorWallet}
            size="sm"
            layout="horizontal"
          />
          <div className="text-xs text-muted-foreground">
            {totalPanels} panels • {genre} • Inspired by{' '}
            {basePaintDay != null || articleUrl ? (
              <DualSourceCredits
                articleUrl={articleUrl}
                basePaintDay={basePaintDay}
                variant="compact"
              />
            ) : (
              'this story'
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap items-center">
          <NarrationControls
            narration={narration}
            panels={panels}
            currentPanelId={currentPanel?.id}
            currentPanelIndex={currentPanelIndex}
            primaryColor={primaryColor}
          />

          <Button
            variant="outline"
            className="gap-2"
            onClick={onDownload}
            title="Download your comic as image"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>

          {video.enabled && (
            <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Optional</span>
                            <VideoUpsellCTA
                video={video}
                onOpenStyleModal={onOpenVideoStyleModal}
                onWatch={onWatchCinematic}
                onStartMontage={() => video.startMontage()}
              />
            </div>
          )}

          {isOwner && (
            <a
              href={`/games/${gameSlug}/insights`}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:border-emerald-400/50 hover:bg-emerald-500/10"
            >
              <BarChart3 className="h-4 w-4" />
              Reader insights
            </a>
          )}

          {mintAvailable ? (
            <Button
              onClick={onMint}
              disabled={isMinting}
              variant="outline"
              className="gap-2"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <Zap className="w-4 h-4" />
              {isMinting ? 'Preparing NFT...' : hasSecretEpilogue ? 'Optional: own & unlock' : 'Optional: own game'}
            </Button>
          ) : onFundGame ? (
            <Button
              onClick={onFundGame}
              disabled={isFunding}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isFunding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              {isFunding ? 'Paying…' : `Pay ${fundCostLabel || ''} to Own`}
            </Button>
          ) : onConnectWallet ? (
            <Button
              onClick={onConnectWallet}
              className="gap-2 bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Wallet className="w-4 h-4" />
              Connect to Own
            </Button>
          ) : (
            <Button disabled className="gap-2">
              <Zap className="w-4 h-4" />
              Own game
            </Button>
          )}

          {ipRegistrationReady && !showIPRegistration && (
            // Demoted to a quiet advanced link: Story IP registration is a
            // testnet chain-switch most players don't need at the payoff moment.
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-emerald-300 hover:underline"
              onClick={onShowIPRegistration}
            >
              Advanced: register IP on Story (testnet)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
