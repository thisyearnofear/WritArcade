'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Grid3X3, Eye, Zap } from 'lucide-react'
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

export interface ComicBookFinalePanelData {
  id: string
  narrativeText: string
  imageUrl: string | null
  imageModel: string
  userChoice?: string
  audioUrl?: string | null  // Audio narration URL
}

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

  // Video upsell — data flow extracted to useVideoMotion
  const video = useVideoMotion(gameSlug)
  const videoStatus = video.status
  const getPanelVideo = video.getPanelVideo
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
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => setFontsLoaded(true))
    } else {
      setFontsLoaded(true)
    }
  }, [])

  const currentPanel = panels[currentPanelIndex]
  const totalPanels = panels.length
  const ipRegistrationReady = (nftMinted || showIPRegistration) && !storyIpId

  useEffect(() => {
    if (nftMinted && !storyIpId) {
      setShowIPRegistration(true)
    }
  }, [nftMinted, storyIpId])

  const firstVideoUrl = video.firstVideoUrl

  const shareData = {
    gameTitle,
    genre,
    panelCount: totalPanels,
    title: gameTitle,
    text: `Check out my ${genre} comic "${gameTitle}" created with writersarcade! ${totalPanels} panels of interactive storytelling.`,
    url: typeof window !== 'undefined' ? window.location.href : '',
    author: authorParagraphUsername,
    videoUrl: firstVideoUrl ?? undefined,
  }

  const handleMintWithMetadata = async () => {
    if (!mintAvailable) return
    try {
      await onMint(panels)
      setShowIPRegistration(true)
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
              <FinaleCinematicView
                video={video}
                panels={panels}
                primaryColor={primaryColor}
                gameTitle={gameTitle}
                genre={genre}
                gameInsights={gameInsights}
                insightsLoading={insightsLoading}
              />
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

        {/* Footer - Action buttons */}
        <FinaleFooter
          gameTitle={gameTitle}
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
          shareData={shareData}
          narration={narration}
          video={video}
          isMinting={isMinting}
          mintAvailable={mintAvailable}
          onBack={onBack}
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
      </div>
    </>
  )
}
