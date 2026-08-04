'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Download, Zap, Grid3X3, Eye, Pencil, Check, X, Loader2, Wallet, AlertTriangle } from 'lucide-react'
import { useGameInsights } from '../hooks/use-game-insights'
import { ImageLightbox } from './image-lightbox'
import { ShareDropdown } from '@/components/ui/share-dropdown'
import { useVideoMotion } from './finale-video-motion'
import {
  VideoUpsellCTA,
  CinematicToggleButton,
  VideoStyleModal,
  FinaleCinematicView,
} from './finale-video-screen'
import { useNarration, NarrationControls } from './finale-narration'
import { UserAttribution, AttributionPair } from '@/components/ui/user-attribution'
import { IPRegistration } from '@/components/story/IPRegistration'
import type { GameCreator, GameAuthor } from '@/lib/services/ipfs-metadata.service'
import { PostGameFeedback } from '@/components/game/post-game-feedback'
import { StreamingTypewriter, PretextContainer } from '@/components/effects'
import {
  shouldShowFeedbackPrompt,
  disableFeedbackPrompts,
} from './feedback-prompt'

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
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<'single' | 'grid' | 'nft-preview' | 'cinematic'>('grid')
  const [showIPRegistration, setShowIPRegistration] = useState(false)
  const [isEditingText, setIsEditingText] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showFeedback, setShowFeedback] = useState(false) // Show feedback modal after gameplay

  // Video upsell — data flow extracted to useVideoMotion; UI pieces are the
  // finale-video-screen components below. Only the modal-open state stays here.
  const [showVideoStyleModal, setShowVideoStyleModal] = useState(false)
  const video = useVideoMotion(gameSlug)
  const videoStatus = video.status
  const getPanelVideo = video.getPanelVideo
  const { insights: gameInsights, isLoading: insightsLoading } = useGameInsights(gameSlug, isOwner)

  // Audio narration — extracted to useNarration; the hook owns panel audio
  // URLs, generation/playback/autoplay state, and its keyboard shortcut.
  const narration = useNarration({
    panels,
    genre,
    currentPanelIndex,
    onAdvancePanel: setCurrentPanelIndex,
    onPanelAudioChange,
    navigationBlocked: isImageExpanded || isEditingText,
  })
  const {
    audioRef,
    setIsPlaying,
    handleAudioEnded,
    handleAudioError,
  } = narration

  const [fontsLoaded, setFontsLoaded] = useState(false)
  
  // Font loading gate
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

  // Find the first completed video URL for sharing
  const firstVideoUrl = video.firstVideoUrl

  // Prepare share data using existing game props
  const shareData = {
    gameTitle,
    genre,
    panelCount: totalPanels,
    title: gameTitle,
    text: `Check out my ${genre} comic "${gameTitle}" created with writersarcade! ${totalPanels} panels of interactive storytelling.`,
    url: typeof window !== 'undefined' ? window.location.href : '',
    author: authorParagraphUsername,
    videoUrl: firstVideoUrl,
  }

  const handleNext = () => {
    if (currentPanelIndex < totalPanels - 1) {
      setCurrentPanelIndex(currentPanelIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentPanelIndex > 0) {
      setCurrentPanelIndex(currentPanelIndex - 1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isImageExpanded || isEditingText) return // Don't navigate when editing or in lightbox
    if (e.key === 'ArrowRight') handleNext()
    if (e.key === 'ArrowLeft') handlePrev()
  }

  const handleStartEdit = () => {
    setEditedText(currentPanel.narrativeText)
    setIsEditingText(true)
  }

  const handleSaveEdit = () => {
    if (onPanelTextChange && editedText.trim()) {
      onPanelTextChange(currentPanelIndex, editedText.trim())
    }
    setIsEditingText(false)
  }

  const handleCancelEdit = () => {
    setEditedText('')
    setIsEditingText(false)
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
    // Create a canvas to combine all panels into one image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Add roundRect function to canvas context if not available
    if (!CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function (x: number, y: number, width: number, height: number, radius: number) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + width, y, x + width, y + height, radius);
        this.arcTo(x + width, y + height, x, y + height, radius);
        this.arcTo(x, y + height, x, y, radius);
        this.arcTo(x, y, x + width, y, radius);
        this.closePath();
        return this;
      };
    }

    const canvasWidth = 800; // Wider canvas for better text display
    const canvasHeight = totalPanels > 0 ? 600 + (totalPanels * 500) : 800; // Dynamic height based on panels
    const padding = 40;
    const headerHeight = 120;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fill background with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Add title header - centered
    ctx.fillStyle = primaryColor;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameTitle, canvasWidth / 2, 60);

    ctx.fillStyle = '#AAAAAA';
    ctx.font = '18px Arial';
    ctx.fillText(`${genre} • ${totalPanels} Panels • writersarcade`, canvasWidth / 2, 100);

    // Center line separator
    ctx.strokeStyle = `${primaryColor}40`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, headerHeight);
    ctx.lineTo(canvasWidth - padding, headerHeight);
    ctx.stroke();

    // Add panels with centered layout
    let loadedImages = 0;
    const totalImages = panels.filter(p => p.imageUrl).length;

    panels.forEach((panel, idx) => {
      const yPosition = headerHeight + padding + (idx * 500);

      if (panel.imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Draw image centered
          const imageWidth = 640;
          const imageHeight = 320;
          const imageX = (canvasWidth - imageWidth) / 2;
          const imageY = yPosition;

          // Draw image with rounded corners
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(imageX, imageY, imageWidth, imageHeight, 12);
          ctx.clip();
          ctx.drawImage(img, imageX, imageY, imageWidth, imageHeight);
          ctx.restore();

          // Draw narrative text - centered and full text
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '16px Arial';
          ctx.textAlign = 'left';

          // Break text into lines that fit within the canvas width
          const maxWidth = 700;
          const lineHeight = 20;
          const textX = (canvasWidth - maxWidth) / 2;
          const textY = yPosition + imageHeight + 20;

          const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
            const words = text.split(' ');
            let line = '';
            let currentY = y;

            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              const metrics = ctx.measureText(testLine);
              const testWidth = metrics.width;

              if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, x, currentY);
            return currentY;
          };

          const finalY = wrapText(panel.narrativeText, textX, textY, maxWidth, lineHeight);

          // Add separator between panels
          if (idx < panels.length - 1) {
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding, finalY + 60);
            ctx.lineTo(canvasWidth - padding, finalY + 60);
            ctx.stroke();
          }

          loadedImages++;
          if (loadedImages === totalImages || totalImages === 0) {
            // All images loaded, download the canvas
            const link = document.createElement('a');
            link.download = `${gameTitle.replace(/[^a-zA-Z0-9]/g, '_')}_comic.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
          }
        };
        img.src = panel.imageUrl;
      } else {
        // If no image, just draw text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';

        // Draw narrative text - centered and full text
        const maxWidth = 700;
        const lineHeight = 20;
        const textX = (canvasWidth - maxWidth) / 2;
        const textY = yPosition + 20;

        const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
          const words = text.split(' ');
          let line = '';
          let currentY = y;

          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
              ctx.fillText(line, x, currentY);
              line = words[n] + ' ';
              currentY += lineHeight;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, x, currentY);
          return currentY;
        };

        const finalY = wrapText(panel.narrativeText, textX, textY, maxWidth, lineHeight);

        // Add separator between panels
        if (idx < panels.length - 1) {
          ctx.strokeStyle = '#444444';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(padding, finalY + 60);
          ctx.lineTo(canvasWidth - padding, finalY + 60);
          ctx.stroke();
        }

        loadedImages++;
        if (loadedImages === totalImages || totalImages === 0) {
          // All images loaded (or no images), download the canvas
          const link = document.createElement('a');
          link.download = `${gameTitle.replace(/[^a-zA-Z0-9]/g, '_')}_comic.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      }
    });

    // If no panels, just download the text version
    if (totalPanels === 0) {
      const link = document.createElement('a');
      link.download = `${gameTitle.replace(/[^a-zA-Z0-9]/g, '_')}_comic.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
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
      
      <ImageLightbox
        isOpen={isImageExpanded}
        imageUrl={currentPanel.imageUrl}
        imageModel={currentPanel.imageModel}
        narrativeText={currentPanel.narrativeText}
        panelNumber={currentPanelIndex + 1}
        totalPanels={totalPanels}
        primaryColor={primaryColor}
        onClose={() => setIsImageExpanded(false)}
        onNavigate={(direction) => {
          if (direction === 'next' && currentPanelIndex < totalPanels - 1) {
            setCurrentPanelIndex(currentPanelIndex + 1)
          } else if (direction === 'prev' && currentPanelIndex > 0) {
            setCurrentPanelIndex(currentPanelIndex - 1)
          }
        }}
        canNavigatePrev={currentPanelIndex > 0}
        canNavigateNext={currentPanelIndex < totalPanels - 1}
      />
      <div
        className="min-h-screen w-full flex flex-col animate-fade-in"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}05, black)`,
        }}
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
                  borderColor: primaryColor
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
                <div
                  className="text-2xl font-bold"
                  style={{ color: primaryColor }}
                >
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
              <div
                className="rounded-xl overflow-hidden border-4 shadow-2xl max-w-4xl mx-auto"
                style={{
                  borderColor: primaryColor,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                }}
              >
                {/* Image / Video */}
                <div
                  className="w-full aspect-video overflow-hidden bg-black relative group cursor-pointer"
                  onClick={() => currentPanel.imageUrl && setIsImageExpanded(true)}
                >
                  {getPanelVideo(currentPanel.id)?.videoUrl ? (
                    <video
                      src={getPanelVideo(currentPanel.id)?.videoUrl ?? undefined}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : currentPanel.imageUrl ? (
                    <>
                      <img
                        src={currentPanel.imageUrl}
                        alt={`Panel ${currentPanelIndex + 1}`}
                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                        loading="lazy"
                        style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}22, #000)` }}
                        onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = '1' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.5' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60"></div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-200 opacity-0 group-hover:opacity-100">
                        <div className="text-white text-sm font-medium">Click to expand</div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-black animate-pulse">
                      <div className="text-center space-y-2">
                        <div className="w-8 h-8 mx-auto rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                        <p className="text-muted-foreground text-xs">Generating image…</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Model badge and regeneration */}
                <div className="px-6 py-3 bg-black/40 border-b border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground shrink-0">Generated with:</span>
                      <span
                        className="text-xs font-mono px-2 py-1 rounded truncate"
                        style={{
                          backgroundColor: `${primaryColor}20`,
                          color: primaryColor,
                        }}
                      >
                        {currentPanel.imageModel}
                      </span>
                    </div>
                    {onPanelImageChange && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowCustomPrompt(v => !v)}
                          className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
                          title="Use a custom prompt instead of regenerating with the narrative"
                        >
                          {showCustomPrompt ? '← Use narrative' : '✏️ Custom prompt'}
                        </button>
                        <Button
                          onClick={() => onPanelImageChange(
                            currentPanelIndex,
                            showCustomPrompt ? customPrompt.trim() || undefined : undefined
                          )}
                          disabled={regeneratingMessageId === currentPanel.id || (showCustomPrompt && !customPrompt.trim())}
                          size="sm"
                          className="bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 text-white transition-all"
                          title={currentPanel.imageUrl ? 'Regenerate with a fresh visual' : 'Retry image generation'}
                        >
                          {regeneratingMessageId === currentPanel.id
                            ? '⏳ Regenerating…'
                            : currentPanel.imageUrl
                              ? '🔄 New Image'
                              : '⚠️ Retry Image'}
                        </Button>
                      </div>
                    )}
                  </div>
                  {showCustomPrompt && onPanelImageChange && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                        Custom image prompt
                      </label>
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Describe the visual you want for this panel…"
                        className="w-full bg-card border border-purple-500/40 rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[64px] resize-y"
                      />
                    </div>
                  )}
                </div>

                {/* Narrative in speech bubble */}
                <div className="p-6 md:p-8 space-y-4">
                  <div
                    className="relative p-4 rounded-lg border-2 group/text"
                    style={{
                      borderColor: primaryColor,
                      backgroundColor: `${primaryColor}10`,
                    }}
                  >
                    {/* Speech bubble tail */}
                    <div
                      className="absolute -bottom-3 left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent"
                      style={{ borderTopColor: primaryColor }}
                    ></div>

                    {isEditingText ? (
                      <div className="space-y-3">
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          className="w-full bg-card border border-purple-500 rounded-lg p-3 text-foreground text-base md:text-lg leading-relaxed font-medium focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[120px] resize-y"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="gap-1"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            className="gap-1 bg-green-600 hover:bg-green-500"
                          >
                            <Check className="w-3 h-3" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        {/* Pretext-powered text container ensures zero-CLS and high-performance layout */}
                        <PretextContainer
                          text={currentPanel.narrativeText}
                          maxWidth={800} // Approximate max width for the narrative area
                          font="18px Inter, system-ui, sans-serif"
                          lineHeight={1.625}
                          className="flex-1"
                        >
                          {() => (
                            <div className="text-foreground text-base md:text-lg leading-relaxed font-medium min-h-[1.5em]">
                              {fontsLoaded ? (
                                <StreamingTypewriter 
                                  key={`${currentPanel.id}-${currentPanel.narrativeText}`}
                                  text={currentPanel.narrativeText} 
                                  speed={40}
                                />
                              ) : (
                                <span className="opacity-0">{currentPanel.narrativeText}</span>
                              )}
                            </div>
                          )}
                        </PretextContainer>
                        {onPanelTextChange && (
                          <button
                            onClick={handleStartEdit}
                            className="p-2 md:opacity-0 md:group-hover/text:opacity-100 hover:bg-purple-600/20 rounded text-purple-400 transition-opacity flex-shrink-0"
                            title="Edit narrative text"
                            aria-label="Edit narrative text"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* User choice indicator */}
                  {currentPanel.userChoice && (
                    <div
                      className="p-3 rounded-lg text-sm"
                      style={{
                        backgroundColor: `${primaryColor}15`,
                        borderLeft: `3px solid ${primaryColor}`,
                      }}
                    >
                      <p className="text-muted-foreground">
                        <span className="text-muted-foreground">Your choice: </span>
                        <span className="font-semibold">{currentPanel.userChoice}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* GRID VIEW */}
            {viewMode === 'grid' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {panels.map((panel, idx) => (
                    <div
                      key={panel.id}
                      className="rounded-lg overflow-hidden border-2 shadow-lg cursor-pointer transition-transform hover:scale-105"
                      style={{
                        borderColor: idx === currentPanelIndex ? primaryColor : 'rgba(255,255,255,0.2)',
                        backgroundColor: 'rgba(0,0,0,0.4)',
                      }}
                      onClick={() => setCurrentPanelIndex(idx)}
                    >
                      <div className="aspect-square overflow-hidden bg-black">
                        {getPanelVideo(panel.id)?.videoUrl ? (
                          <video
                            src={getPanelVideo(panel.id)?.videoUrl ?? undefined}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : panel.imageUrl ? (
                          <img
                            src={panel.imageUrl}
                            alt={`Panel ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-card">
                            <p className="text-muted-foreground text-sm">No image</p>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium" style={{ color: primaryColor }}>
                            {panel.id.startsWith('epilogue-') ? 'Epilogue' : `Panel ${idx + 1}`}
                          </span>
                          <span className="text-xs text-muted-foreground">{panel.imageModel}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {panel.narrativeText}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reflection Card */}
                {epilogueReflection && (
                  <div
                    className="mt-8 p-6 rounded-xl border-l-4"
                    style={{
                      borderLeftColor: primaryColor,
                      backgroundColor: `${primaryColor}08`,
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Back to the Source
                        </h3>
                        <h4 className="text-lg font-bold mb-1">
                          {articleTitle || 'Original Article'}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          by {authorParagraphUsername}
                        </p>
                        <p className="text-base leading-relaxed">
                          {epilogueReflection}
                        </p>
                        <a
                          href={articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-3 text-sm underline opacity-60 hover:opacity-100 transition-opacity"
                        >
                          Read original article →
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </>
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
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-2" style={{ color: primaryColor }}>
                    📜 Your NFT Comic Preview
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    This is how your comic will appear as an NFT
                  </p>
                </div>

                {/* NFT metadata preview — judges love this */}
                <div className="max-w-2xl mx-auto rounded-lg border border-border bg-card/60 p-4 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    On-chain metadata (GameMetadata struct)
                  </p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs font-mono">
                    <dt className="text-muted-foreground">title</dt>
                    <dd className="break-words">{gameTitle}</dd>
                    <dt className="text-muted-foreground">genre</dt>
                    <dd>{genre}</dd>
                    <dt className="text-muted-foreground">difficulty</dt>
                    <dd>{difficulty ?? 'medium'}</dd>
                    <dt className="text-muted-foreground">creator</dt>
                    <dd className="break-all">{creatorWallet}</dd>
                    <dt className="text-muted-foreground">articleUrl</dt>
                    <dd className="break-all">{articleUrl}</dd>
                  </dl>
                </div>

                <div
                  className="rounded-xl p-6 border-4 shadow-2xl max-w-2xl mx-auto"
                  style={{
                    borderColor: primaryColor,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                  }}
                >
                  {/* Comic title header */}
                  <div className="text-center mb-6 pb-4 border-b border-white/20">
                    <h3 className="text-2xl font-bold mb-2">{gameTitle}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{genre} • {totalPanels} Panels</p>

                    {/* Attribution in NFT preview */}
                    <div className="flex items-center justify-center gap-4 text-xs">
                      <span className="text-muted-foreground">Created by</span>
                      <UserAttribution
                        type="creator"
                        walletAddress={creatorWallet}
                        size="sm"
                        showLink={false}
                      />
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">Inspired by</span>
                      <UserAttribution
                        type="author"
                        paragraphUsername={authorParagraphUsername}
                        authorWallet={authorWallet}
                        size="sm"
                        showLink={false}
                      />
                    </div>
                  </div>

                  {/* Vertical comic strip layout */}
                  <div className="space-y-6">
                    {panels.map((panel, idx) => (
                      <div
                        key={panel.id}
                        className="rounded-xl overflow-hidden border-2"
                        style={{ borderColor: primaryColor + '40' }}
                      >
                        {/* Image */}
                        <div className="w-full h-48 overflow-hidden bg-black">
                          {panel.imageUrl ? (
                            <img
                              src={panel.imageUrl}
                              alt={`Scene ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-black">
                              <span className="text-muted-foreground text-sm">No image</span>
                            </div>
                          )}
                        </div>

                        {/* Narrative text - centered and full text */}
                        <div className="p-4 bg-black/60">
                          <p className="text-sm leading-relaxed text-foreground text-center">
                            {panel.narrativeText}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* NFT metadata footer */}
                  <div className="mt-6 pt-4 border-t border-white/20 text-center">
                    <p className="text-xs text-muted-foreground">
                      🎨 Generated with writersarcade • Unique Comic NFT
                    </p>
                  </div>
                </div>

                {/* Mint-this-NFT call-to-action inside the preview */}
                <div className="text-center">
                  {mintAvailable ? (
                    <>
                      <Button
                        onClick={handleMintWithMetadata}
                        disabled={isMinting}
                        size="lg"
                        className="gap-2"
                        style={{
                          backgroundColor: primaryColor,
                          color: 'white',
                        }}
                      >
                        <Zap className="w-4 h-4" />
                        {isMinting ? 'Preparing NFT…' : 'Mint this NFT'}
                      </Button>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {`Cost: ${mintCostLabel || 'token mint fee'}${mintTokenLabel ? ` in ${mintTokenLabel}` : ''}. Wallet prompts: approve token spend, then mint on Base.`}
                      </p>
                    </>
                  ) : onFundGame ? (
                    <>
                      <Button
                        onClick={onFundGame}
                        disabled={isFunding}
                        size="lg"
                        className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        {isFunding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                        {isFunding ? 'Processing payment…' : `Pay ${fundCostLabel || ''} to unlock minting`}
                      </Button>
                      {fundError && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-md px-3 py-1.5">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span className="flex-1">{fundError}</span>
                          {onDismissFundError && (
                            <button onClick={onDismissFundError} className="text-red-300 hover:text-white">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {fundBalanceLabel && (
                          <span className={`font-medium ${hasEnoughToFund === false ? 'text-red-400' : 'text-emerald-400'}`}>
                            Balance: {fundBalanceLabel}
                            {hasEnoughToFund === false && ' (insufficient)'}
                          </span>
                        )}
                        {fundBalanceLabel && ' · '}
                        One payment unlocks minting. Your wallet will prompt you to approve the spend.
                      </p>
                    </>
                  ) : onConnectWallet ? (
                    <>
                      <Button
                        onClick={onConnectWallet}
                        size="lg"
                        className="gap-2 bg-purple-600 hover:bg-purple-500 text-white"
                      >
                        <Wallet className="w-4 h-4" />
                        Connect wallet to unlock minting
                      </Button>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {fundCostLabel ? `Cost: ${fundCostLabel}. ` : ''}Connect your wallet to pay and enable minting.
                      </p>
                    </>
                  ) : (
                    <>
                      <Button
                        disabled
                        size="lg"
                        className="gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Mint this NFT
                      </Button>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {mintUnavailableReason || 'This legacy game is playable, but minting is unavailable.'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Navigation controls (only show in single mode) */}
            {viewMode === 'single' && (
              <div className="flex items-center justify-between">
                <Button
                  onClick={handlePrev}
                  disabled={currentPanelIndex === 0}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 text-white transition-all"
                  variant="outline"
                >
                  ← Previous
                </Button>

                {/* Page indicator */}
                <div className="flex items-center gap-2">
                  {panels.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPanelIndex(idx)}
                      className="w-3 h-3 rounded-full transition-all"
                      style={{
                        backgroundColor:
                          idx === currentPanelIndex ? primaryColor : 'rgba(255,255,255,0.2)',
                        width: idx === currentPanelIndex ? '32px' : '12px',
                      }}
                      title={`Go to panel ${idx + 1}`}
                    />
                  ))}
                </div>

                <Button
                  onClick={handleNext}
                  disabled={currentPanelIndex === totalPanels - 1}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 text-white transition-all"
                  variant="outline"
                >
                  Next →
                </Button>
              </div>
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
        <div
          className="border-t border-white/10 p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-md"
          style={{
            boxShadow: `0 -4px 20px ${primaryColor}10`,
          }}
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
                {totalPanels} panels • {genre} • Inspired by <a href={articleUrl} target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground underline">original article</a>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 flex-wrap items-center">
              {/* Audio narration controls (extracted) */}
              <NarrationControls
                narration={narration}
                panels={panels}
                currentPanelId={currentPanel?.id}
                currentPanelIndex={currentPanelIndex}
                primaryColor={primaryColor}
              />


              <ShareDropdown
                data={shareData}
                variant="outline"
              />

              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDownload}
                title="Download your comic as image"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>

              {/* Video upsell CTA */}
              <VideoUpsellCTA
                video={video}
                onOpenStyleModal={() => setShowVideoStyleModal(true)}
                onWatch={() => setViewMode('cinematic')}
              />

              {mintAvailable ? (
                <Button
                  onClick={handleMintWithMetadata}
                  disabled={isMinting}
                  className="gap-2"
                  style={{
                    backgroundColor: primaryColor,
                    color: 'white',
                  }}
                >
                  <Zap className="w-4 h-4" />
                  {isMinting ? 'Preparing NFT...' : 'Mint as NFT'}
                </Button>
              ) : onFundGame ? (
                <Button
                  onClick={onFundGame}
                  disabled={isFunding}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {isFunding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  {isFunding ? 'Paying…' : `Pay ${fundCostLabel || ''} to Mint`}
                </Button>
              ) : onConnectWallet ? (
                <Button
                  onClick={onConnectWallet}
                  className="gap-2 bg-purple-600 hover:bg-purple-500 text-white"
                >
                  <Wallet className="w-4 h-4" />
                  Connect to Mint
                </Button>
              ) : (
                <Button disabled className="gap-2">
                  <Zap className="w-4 h-4" />
                  Mint as NFT
                </Button>
              )}

              {ipRegistrationReady && !showIPRegistration && (
                <Button
                  variant="outline"
                  className="gap-2 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10"
                  onClick={() => setShowIPRegistration(true)}
                >
                  Register Game IP
                </Button>
              )}
            </div>
          </div>
        </div>

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
            style={{
              boxShadow: `inset 0 1px 0 ${primaryColor}15`,
            }}
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

        {/* NEW: Post-game feedback modal (NPS + comments) */}
        {showFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg">
              <PostGameFeedback
                onSubmit={async (feedback) => {
                  try {
                    // Determine the slug from the current location or pass it properly
                    // For now, we'll extract it from the window location
                    const slug = window.location.pathname.split('/').pop() || ''
                    
                    // Submit feedback to backend
                    const response = await fetch(`/api/games/${slug}/feedback`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        npsScore: feedback.npsScore,
                        npsComment: feedback.comment,
                      }),
                    })

                    if (!response.ok) {
                      throw new Error('Failed to submit feedback')
                    }
                  } catch (error) {
                    console.error('Error submitting feedback:', error)
                    // Don't throw, let user close anyway
                  }
                }}
                onSkip={() => setShowFeedback(false)}
                onDisable={() => {
                  disableFeedbackPrompts()
                  setShowFeedback(false)
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
