'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronLeft, Clapperboard, Grid3X3, Eye, X, Zap } from 'lucide-react'
import { useAccount } from 'wagmi'
import { CREDITS_CONFIG } from '@/lib/writer-coins'
import { useGameInsights } from '../hooks/use-game-insights'
import { useVideoMotion } from './finale-video-motion'
import {
  CinematicToggleButton,
  VideoStyleModal,
  FinaleCinematicView,
} from './finale-video-screen'
import { useNarration } from './finale-narration'
import { IPRegistration } from '@/components/story/IPRegistration'
import type { GameCreator, GameAuthor } from '@/lib/services/ipfs-metadata.service'
import { shouldShowFeedbackPrompt } from './feedback-prompt'
import { downloadComicAsImage } from './finale-download'
import { SinglePanelView } from './finale-single-panel-view'
import { GridView } from './finale-grid-view'
import { NftPreviewView } from './finale-nft-preview'
import { FinaleFooter } from './finale-footer'
import { FinaleFeedbackModal } from './finale-feedback-modal'
import { ShareDropdown } from '@/components/ui/share-dropdown'
import { OwnershipExplainer } from '@/components/ownership/ownership-explainer'

export interface ComicBookFinalePanelData {
  id: string
  narrativeText: string
  imageUrl: string | null
  imageModel: string
  userChoice?: string
  audioUrl?: string | null  // Audio narration URL
}

/** Story Protocol UI is opt-in — same flag semantics as Web3Provider. */
const STORY_IP_UI_ENABLED = process.env.NEXT_PUBLIC_STORY_ENABLED !== 'false'

interface ComicBookFinaleProps {
  gameId: string
  gameSlug: string
  gameTitle: string
  genre: string
  primaryColor: string
  panels: ComicBookFinalePanelData[]
  onBack: () => void
  onMint: (panelData: ComicBookFinalePanelData[], metadata?: { nftMetadataUri: string; gameMetadataUri: string; creator: GameCreator; author: GameAuthor }) => void | Promise<void>
  onStoryRegistrationComplete?: (result: { ipId: string; txHash: string }) => void
  isMinting?: boolean
  nftMinted?: boolean
  storyIpId?: string
  // Attribution data
  creatorWallet: string
  articleUrl: string
  articleTitle?: string
  authorParagraphUsername: string
  authorWallet?: string
  difficulty?: string
  userChoices?: Array<{ panelIndex: number; choice: string; timestamp: string }>
  // Text editing callback
  onPanelTextChange?: (panelIndex: number, newText: string) => void
  // Image editing callback
  onPanelImageChange?: (panelIndex: number, customPrompt?: string) => void
  // Whether the current panel is being regenerated (driven by the session hook)
  regeneratingMessageId?: string | null
  // Audio editing callback - persists audio to panel data
  onPanelAudioChange?: (panelIndex: number, audioUrl: string | null) => void
  // Epilogue reflection
  epilogueReflection?: string
  // Whether the current user owns the game (used to gate owner-only analytics)
  isOwner?: boolean
  mintAvailable?: boolean
  mintUnavailableReason?: string
  mintTokenLabel?: string
  mintCostLabel?: string
  hasSecretEpilogue?: boolean
  onFundGame?: () => void
  onConnectWallet?: (() => void) | undefined
  isFunding?: boolean
  fundCostLabel?: string
  fundBalanceLabel?: string
  hasEnoughToFund?: boolean
  fundError?: string | null
  onDismissFundError?: () => void
}

export function ComicBookFinale({
  gameId,
  gameSlug,
  gameTitle,
  genre,
  primaryColor,
  panels,
  onBack,
  onMint,
  onStoryRegistrationComplete,
  isMinting = false,
  nftMinted = false,
  storyIpId,
  creatorWallet,
  articleUrl,
  articleTitle,
  authorParagraphUsername,
  authorWallet,
  difficulty = 'medium',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userChoices = [],
  onPanelTextChange,
  onPanelImageChange,
  regeneratingMessageId,
  onPanelAudioChange,
  epilogueReflection,
  isOwner = false,
  mintAvailable = true,
  mintUnavailableReason,
  mintTokenLabel,
  mintCostLabel,
  hasSecretEpilogue = false,
  onFundGame,
  onConnectWallet,
  isFunding = false,
  fundCostLabel,
  fundBalanceLabel,
  hasEnoughToFund,
  fundError,
  onDismissFundError,
}: ComicBookFinaleProps) {
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'single' | 'grid' | 'nft-preview' | 'cinematic'>('grid')
  const [showIPRegistration, setShowIPRegistration] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showVideoStyleModal, setShowVideoStyleModal] = useState(false)

  // Video upsell auto-offer: surfaced once when the player actually has
  // enough credits, instead of hiding behind discovery in the footer.
  const { address: offerWalletAddress } = useAccount()
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null)
  const videoOfferKey = `wa:video-offer:${gameSlug}`
  const [videoOfferDismissed, setVideoOfferDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      return localStorage.getItem(videoOfferKey) === '1'
    } catch {
      return true
    }
  })

  // Video upsell — data flow extracted to useVideoMotion
  const video = useVideoMotion(gameSlug)
  const videoStatus = video.status
  const getPanelVideo = video.getPanelVideo
  const previousVideoStatus = useRef(video.status)
  const previousVideoUrl = useRef(video.firstVideoUrl)
  const { insights: gameInsights, isLoading: insightsLoading } = useGameInsights(gameSlug, isOwner)

  // Audio narration — extracted to useNarration
  const narration = useNarration({
    panels,
    genre,
    currentPanelIndex,
    onAdvancePanel: setCurrentPanelIndex,
    onPanelAudioChange,
    // Block narration keyboard shortcuts when not in single-panel view
    navigationBlocked: viewMode !== 'single',
  })
  const { audioRef, setIsPlaying, handleAudioEnded, handleAudioError } = narration

  const [fontsLoaded, setFontsLoaded] = useState(false)

  useEffect(() => {
    const becameReady =
      video.status === 'completed' &&
      Boolean(video.firstVideoUrl) &&
      (previousVideoStatus.current === 'pending' || previousVideoUrl.current === null)

    if (becameReady && (viewMode === 'grid' || viewMode === 'single')) {
      const transitionId = window.setTimeout(() => setViewMode('cinematic'), 0)
      return () => window.clearTimeout(transitionId)
    }

    previousVideoStatus.current = video.status
    previousVideoUrl.current = video.firstVideoUrl
  }, [video.status, video.firstVideoUrl, viewMode])

  useEffect(() => {
    if (typeof document === 'undefined' || !('fonts' in document)) return
    let cancelled = false
    document.fonts.ready.then(() => {
      if (!cancelled) setFontsLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const currentPanel = panels[currentPanelIndex]
  const totalPanels = panels.length

  // Story Protocol IP registration is opt-in (Base-first product); the
  // section never auto-opens — players reach it via the advanced link.
  const ipRegistrationReady =
    STORY_IP_UI_ENABLED && (nftMinted || showIPRegistration) && !storyIpId

  // Fetch credits once for the auto-offer — cheap, silent on failure.
  const videoStatusForOffer = video.status
  useEffect(() => {
    if (videoStatusForOffer !== 'idle' && videoStatusForOffer !== 'failed') return
    if (videoOfferDismissed) return
    let cancelled = false
    const query = offerWalletAddress ? `?wallet=${encodeURIComponent(offerWalletAddress)}` : ''
    fetch(`/api/ramp/credits${query}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) setCreditsBalance(data.data.credits ?? 0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
     
  }, [videoStatusForOffer, videoOfferDismissed, offerWalletAddress])

  const showVideoOffer =
    video.enabled &&
    !videoOfferDismissed &&
    !showVideoStyleModal &&
    (video.status === 'idle' || video.status === 'failed') &&
    creditsBalance !== null &&
    creditsBalance >= CREDITS_CONFIG.cost['video-upsell']

  const dismissVideoOffer = (persist = true) => {
    setVideoOfferDismissed(true)
    if (persist) {
      try {
        localStorage.setItem(videoOfferKey, '1')
      } catch {
        // storage unavailable — session-only dismissal is fine
      }
    }
  }



  const handleMintWithMetadata = async () => {
    if (!mintAvailable) return
    try {
      await onMint(panels)
      setShowFeedback(shouldShowFeedbackPrompt())
    } catch (error) {
      console.error('Mint failed:', error)
    }
  }

  const handleDownload = () => {
    downloadComicAsImage(panels, gameTitle, genre, primaryColor)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (viewMode !== 'single') return
    if (currentPanelIndex < totalPanels - 1 && e.key === 'ArrowRight') {
      setCurrentPanelIndex(currentPanelIndex + 1)
    }
    if (currentPanelIndex > 0 && e.key === 'ArrowLeft') {
      setCurrentPanelIndex(currentPanelIndex - 1)
    }
  }

  return (
    <>
      {/* Hidden audio element for narration playback */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onError={handleAudioError}
        className="hidden"
      />

      <div
        className="min-h-screen w-full flex flex-col animate-fade-in"
        style={{ background: `linear-gradient(135deg, ${primaryColor}05, black)` }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Header */}
        <div className="border-b border-white/10 px-4 md:px-8 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Back to gameplay"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{gameTitle}</h1>
                <p className="text-sm text-muted-foreground">
                  {genre} • Your Complete Story
                </p>
              </div>
            </div>

            {/* View mode selector */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('single')}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Single
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="gap-2"
              >
                <Grid3X3 className="w-4 h-4" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'nft-preview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('nft-preview')}
                className="gap-2"
                style={{
                  backgroundColor: viewMode === 'nft-preview' ? primaryColor : undefined,
                  borderColor: primaryColor,
                }}
              >
                <Zap className="w-4 h-4" />
                NFT Preview
              </Button>
              <CinematicToggleButton
                video={video}
                active={viewMode === 'cinematic'}
                primaryColor={primaryColor}
                onClick={() => setViewMode('cinematic')}
              />
            </div>

            {/* Panel counter (only show in single mode) */}
            {viewMode === 'single' && (
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                  {currentPanelIndex + 1}/{totalPanels}
                </div>
                <p className="text-xs text-muted-foreground">Panels</p>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-6xl space-y-6">
            {/* SINGLE PANEL VIEW */}
            {viewMode === 'single' && (
              <SinglePanelView
                panels={panels}
                currentPanelIndex={currentPanelIndex}
                setCurrentPanelIndex={setCurrentPanelIndex}
                primaryColor={primaryColor}
                fontsLoaded={fontsLoaded}
                onPanelTextChange={onPanelTextChange}
                onPanelImageChange={onPanelImageChange}
                regeneratingMessageId={regeneratingMessageId}
                getPanelVideo={getPanelVideo}
              />
            )}

            {/* GRID VIEW */}
            {viewMode === 'grid' && (
              <GridView
                panels={panels}
                currentPanelIndex={currentPanelIndex}
                setCurrentPanelIndex={setCurrentPanelIndex}
                primaryColor={primaryColor}
                epilogueReflection={epilogueReflection}
                articleTitle={articleTitle}
                articleUrl={articleUrl}
                authorParagraphUsername={authorParagraphUsername}
                getPanelVideo={getPanelVideo}
              />
            )}

            {/* CINEMATIC VIEW */}
            {viewMode === 'cinematic' && videoStatus === 'completed' && (
              <section aria-labelledby="cinematic-ending-title">
                <h2 id="cinematic-ending-title" tabIndex={-1} className="sr-only">Your animated final-panel reveal</h2>
                <FinaleCinematicView
                video={video}
                panels={panels}
                primaryColor={primaryColor}
                gameTitle={gameTitle}
                genre={genre}
                gameInsights={gameInsights}
                insightsLoading={insightsLoading}
                slug={gameSlug}
                />
              </section>
            )}

            {/* NFT PREVIEW */}
            {viewMode === 'nft-preview' && (
              <NftPreviewView
                panels={panels}
                gameTitle={gameTitle}
                genre={genre}
                totalPanels={totalPanels}
                primaryColor={primaryColor}
                creatorWallet={creatorWallet}
                authorParagraphUsername={authorParagraphUsername}
                authorWallet={authorWallet}
                difficulty={difficulty}
                articleUrl={articleUrl}
                mintAvailable={mintAvailable}
                mintUnavailableReason={mintUnavailableReason}
                mintTokenLabel={mintTokenLabel}
                mintCostLabel={mintCostLabel}
                isMinting={isMinting}
                onMint={handleMintWithMetadata}
                onFundGame={onFundGame}
                onConnectWallet={onConnectWallet}
                isFunding={isFunding}
                fundCostLabel={fundCostLabel}
                fundBalanceLabel={fundBalanceLabel}
                hasEnoughToFund={hasEnoughToFund}
                fundError={fundError}
                onDismissFundError={onDismissFundError}
              />
            )}

            {/* Summary info for grid/NFT views */}
            {(viewMode === 'grid' || viewMode === 'nft-preview') && (
              <div className="text-center">
                <p className="text-muted-foreground text-sm">
                  {viewMode === 'grid' ? 'Click any panel to select it' : 'This is your complete comic story'}
                </p>
              </div>
            )}
          </div>
        </div>

        {video.enabled && video.status === 'completed' && video.firstVideoUrl && (
          <div aria-live="polite" className="mx-4 mb-5 rounded-2xl border border-emerald-400/25 bg-gradient-to-r from-emerald-400/10 via-purple-500/10 to-pink-500/10 p-4 shadow-lg shadow-purple-950/20 md:mx-auto md:mb-6 md:max-w-4xl md:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-emerald-400/15 p-2 text-emerald-300">
                  <Clapperboard className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Your animated ending is ready</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Final-panel reveal · short clip · ready to watch and share.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:shrink-0">
                <Button
                  onClick={() => setViewMode('cinematic')}
                  className="gap-2 bg-white text-black hover:bg-white/90"
                >
                  <Clapperboard className="h-4 w-4" aria-hidden />
                  Watch now
                </Button>
                <ShareDropdown
                  data={{
                    title: gameTitle,
                    text: `I animated the final panel of "${gameTitle}" — what ending would you get?`,
                    url: typeof window !== 'undefined' ? `${window.location.origin}/games/${gameSlug}?play=1` : `/games/${gameSlug}?play=1`,
                    genre,
                    panelCount: totalPanels,
                    gameTitle,
                    videoUrl: video.firstVideoUrl,
                  }}
                  surface="hero_animation_ready"
                  variant="outline"
                  buttonClassName="border-white/20 text-white hover:bg-white/10"
                />
              </div>
            </div>
          </div>
        )}

        {/* Ownership primer — one benefit-led explainer at the money moment.
            Collapsed by default (progressive disclosure): Mint → IP → Royalties. */}
        <details className="group mx-4 mb-5 max-w-6xl rounded-xl border border-white/10 bg-white/[0.02] p-4 md:mx-auto">
          <summary className="flex list-none cursor-pointer select-none items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span>Why own it — how ownership works</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <OwnershipExplainer variant="compact" className="mt-4" />
        </details>

        {/* Utility actions stay secondary to the completion card below. */}
        <FinaleFooter
          genre={genre}
          totalPanels={totalPanels}
          primaryColor={primaryColor}
          creatorWallet={creatorWallet}
          authorParagraphUsername={authorParagraphUsername}
          authorWallet={authorWallet}
          articleUrl={articleUrl}
          panels={panels}
          currentPanel={currentPanel}
          currentPanelIndex={currentPanelIndex}
          gameSlug={gameSlug}
          isOwner={isOwner}
          hasSecretEpilogue={hasSecretEpilogue}
          narration={narration}
          video={video}
          isMinting={isMinting}
          mintAvailable={mintAvailable}
          onDownload={handleDownload}
          onMint={handleMintWithMetadata}
          onFundGame={onFundGame}
          onConnectWallet={onConnectWallet}
          isFunding={isFunding}
          fundCostLabel={fundCostLabel}
          ipRegistrationReady={ipRegistrationReady}
          showIPRegistration={showIPRegistration}
          onShowIPRegistration={() => setShowIPRegistration(true)}
          onOpenVideoStyleModal={() => setShowVideoStyleModal(true)}
          onWatchCinematic={() => setViewMode('cinematic')}
        />

        {/* Video style selection modal */}
        {showVideoStyleModal && (
          <VideoStyleModal
            style={video.style}
            onStyleChange={video.setStyle}
            primaryColor={primaryColor}
            slug={gameSlug}
            onClose={() => setShowVideoStyleModal(false)}
            onStart={() => {
              setShowVideoStyleModal(false)
              void video.start()
            }}
          />
        )}

        {/* Story Protocol IP Registration */}
        {ipRegistrationReady && showIPRegistration && (
          <div id="game-ip-registration" className="border-t border-white/10 p-4 md:p-8 bg-gradient-to-b from-black/40 via-black to-black"
            style={{ boxShadow: `inset 0 1px 0 ${primaryColor}15` }}
          >
            <div className="max-w-6xl mx-auto">
              <div className="mb-4">
                <h3 className="text-sm md:text-base font-semibold text-white flex items-center gap-2 mb-1">
                  <span>📜</span> Register as IP Asset (Optional)
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">Track ownership & set royalty terms on Story Protocol</p>
              </div>
              <IPRegistration
                game={{
                  gameId,
                  title: gameTitle,
                  description: `Interactive ${genre.toLowerCase()} comic with ${totalPanels} panels`,
                  articleUrl: articleUrl,
                  gameCreatorAddress: creatorWallet,
                  authorParagraphUsername: authorParagraphUsername,
                  authorWalletAddress: authorWallet || '',
                  genre: genre.toLowerCase() as 'horror' | 'comedy' | 'mystery',
                  difficulty: difficulty.toLowerCase() as 'easy' | 'hard',
                }}
                onRegistrationComplete={async (result) => {
                  const response = await fetch(`/api/games/${gameSlug}/story-registration`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      walletAddress: creatorWallet,
                      storyIpId: result.ipId,
                      transactionHash: result.txHash,
                    }),
                  })
                  if (!response.ok) {
                    throw new Error('Story registration succeeded, but saving it to the game failed.')
                  }
                  onStoryRegistrationComplete?.({ ipId: result.ipId, txHash: result.txHash })
                }}
              />
            </div>
          </div>
        )}

        {/* Post-game feedback modal */}
        <FinaleFeedbackModal
          show={showFeedback}
          onClose={() => setShowFeedback(false)}
        />

        {/* One-time video upsell offer (only when the balance covers it) */}
        {showVideoOffer && (
          <div className="fixed bottom-24 right-4 z-50 max-w-xs rounded-xl border border-purple-500/30 bg-card p-4 shadow-2xl">
            <button
              type="button"
              onClick={() => dismissVideoOffer()}
              className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss animation offer"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Clapperboard className="h-4 w-4 text-purple-400" aria-hidden />
              <p className="text-sm font-semibold text-white">Make your comic move</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Turn your final panel into a short, shareable animated reveal — you have enough credits
              ({creditsBalance}).
            </p>
            <Button
              onClick={() => {
                dismissVideoOffer(false)
                setShowVideoStyleModal(true)
              }}
              className="w-full gap-2 bg-purple-600 hover:bg-purple-500 text-white"
              size="sm"
            >
              <Clapperboard className="h-4 w-4" />
              Animate final panel · {CREDITS_CONFIG.cost['video-upsell']} credits
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
