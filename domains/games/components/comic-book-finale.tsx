'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Download, Zap, Grid3X3, Eye, Pencil, Check, X, Volume2, VolumeX, Play, Pause, Loader2 } from 'lucide-react'
import { ImageLightbox } from './image-lightbox'
import { ShareDropdown } from '@/components/ui/share-dropdown'
import { UserAttribution, AttributionPair } from '@/components/ui/user-attribution'
import { IPRegistration } from '@/components/story/IPRegistration'
import type { GameCreator, GameAuthor } from '@/lib/services/ipfs-metadata.service'
import { PostGameFeedback } from '@/components/game/post-game-feedback'
import { VoiceNarrationService } from '../services/voice-narration.service'
import { StreamingTypewriter, PretextContainer } from '@/components/effects'

export interface ComicBookFinalePanelData {
  id: string
  narrativeText: string
  imageUrl: string | null
  imageModel: string
  userChoice?: string
  audioUrl?: string | null  // Audio narration URL
}

interface ComicBookFinaleProps {
  gameTitle: string
  genre: string
  primaryColor: string
  panels: ComicBookFinalePanelData[]
  onBack: () => void
  onMint: (panelData: ComicBookFinalePanelData[], metadata?: { nftMetadataUri: string; gameMetadataUri: string; creator: GameCreator; author: GameAuthor }) => void
  isMinting?: boolean
  // Attribution data
  creatorWallet: string
  articleUrl: string
  authorParagraphUsername: string
  authorWallet?: string
  difficulty?: string
  userChoices?: Array<{ panelIndex: number; choice: string; timestamp: string }>
  // Text editing callback
  onPanelTextChange?: (panelIndex: number, newText: string) => void
  // Image editing callback
  onPanelImageChange?: (panelIndex: number, customPrompt?: string) => void
  // Audio editing callback - persists audio to panel data
  onPanelAudioChange?: (panelIndex: number, audioUrl: string | null) => void
}

export function ComicBookFinale({
  gameTitle,
  genre,
  primaryColor,
  panels,
  onBack,
  onMint,
  isMinting = false,
  creatorWallet,
  articleUrl,
  authorParagraphUsername,
  authorWallet,
  difficulty = 'medium',
  userChoices = [],
  onPanelTextChange,
  onPanelImageChange,
  onPanelAudioChange,
}: ComicBookFinaleProps) {
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0)
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<'single' | 'grid' | 'nft-preview'>('single')
  const [showIPRegistration, setShowIPRegistration] = useState(false)
  const [nftMintedMetadata, setNftMintedMetadata] = useState<{ nftMetadataUri: string; gameMetadataUri: string; creator: GameCreator; author: GameAuthor } | null>(null)
  const [isEditingText, setIsEditingText] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [showFeedback, setShowFeedback] = useState(false) // Show feedback modal after gameplay
  
  // Audio narration state
  const [panelAudioUrls, setPanelAudioUrls] = useState<Map<string, string>>(() => {
    // Initialize from panel data if audio already exists
    const initial = new Map<string, string>()
    panels.forEach(p => {
      if (p.audioUrl) initial.set(p.id, p.audioUrl)
    })
    return initial
  })
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [generatingPanelId, setGeneratingPanelId] = useState<string | null>(null) // Track per-panel generation
  const [audioGenerationProgress, setAudioGenerationProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAutoPlayMode, setIsAutoPlayMode] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
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
  const currentAudioUrl = panelAudioUrls.get(currentPanel?.id || '') || currentPanel?.audioUrl

  // Prepare share data using existing game props
  const shareData = {
    gameTitle,
    genre,
    panelCount: totalPanels,
    title: gameTitle,
    text: `Check out my ${genre} comic "${gameTitle}" created with writersarcade! ${totalPanels} panels of interactive storytelling.`,
    url: typeof window !== 'undefined' ? window.location.href : '',
    author: authorParagraphUsername,
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

  // Audio narration handlers
  const generateAllNarration = useCallback(async () => {
    if (isGeneratingAudio) return
    
    setIsGeneratingAudio(true)
    setAudioGenerationProgress(0)
    setAudioError(null)
    
    const newAudioUrls = new Map(panelAudioUrls)
    let errorCount = 0
    
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i]
      setGeneratingPanelId(panel.id)
      
      // Skip if already generated
      if (newAudioUrls.has(panel.id) || panel.audioUrl) {
        setAudioGenerationProgress(((i + 1) / panels.length) * 100)
        continue
      }
      
      try {
        const result = await VoiceNarrationService.generateNarration(
          panel.narrativeText,
          genre
        )
        
        if (result.audioUrl) {
          newAudioUrls.set(panel.id, result.audioUrl)
          // Persist to panel data if callback provided
          if (onPanelAudioChange) {
            onPanelAudioChange(i, result.audioUrl)
          }
        } else {
          errorCount++
        }
      } catch (error) {
        console.error(`Failed to generate audio for panel ${i + 1}:`, error)
        errorCount++
      }
      
      setAudioGenerationProgress(((i + 1) / panels.length) * 100)
    }
    
    setPanelAudioUrls(newAudioUrls)
    setIsGeneratingAudio(false)
    setGeneratingPanelId(null)
    
    if (errorCount > 0) {
      setAudioError(`Failed to generate ${errorCount} of ${panels.length} panels`)
    }
  }, [panels, genre, isGeneratingAudio, panelAudioUrls, onPanelAudioChange])

  // Generate audio for a single panel (per-panel regeneration)
  const regeneratePanelAudio = useCallback(async (panelIndex: number) => {
    const panel = panels[panelIndex]
    if (!panel || generatingPanelId) return
    
    setGeneratingPanelId(panel.id)
    setAudioError(null)
    
    try {
      const result = await VoiceNarrationService.generateNarration(
        panel.narrativeText,
        genre,
        { force: true } // Force regeneration
      )
      
      if (result.audioUrl) {
        setPanelAudioUrls(prev => {
          const updated = new Map(prev)
          updated.set(panel.id, result.audioUrl!)
          return updated
        })
        // Persist to panel data if callback provided
        if (onPanelAudioChange) {
          onPanelAudioChange(panelIndex, result.audioUrl)
        }
      } else {
        setAudioError('Failed to regenerate audio')
      }
    } catch (error) {
      console.error(`Failed to regenerate audio for panel ${panelIndex + 1}:`, error)
      setAudioError('Failed to regenerate audio')
    }
    
    setGeneratingPanelId(null)
  }, [panels, genre, generatingPanelId, onPanelAudioChange])

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !currentAudioUrl) return
    
    setAudioError(null)
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(err => {
        console.error('Audio playback failed:', err)
        setAudioError('Audio playback failed')
      })
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, currentAudioUrl])

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false)
    
    // Auto-advance to next panel in auto-play mode
    if (isAutoPlayMode && currentPanelIndex < totalPanels - 1) {
      setCurrentPanelIndex(prev => prev + 1)
    } else if (isAutoPlayMode && currentPanelIndex === totalPanels - 1) {
      setIsAutoPlayMode(false) // Stop auto-play at end
    }
  }, [isAutoPlayMode, currentPanelIndex, totalPanels])

  const handleAudioError = useCallback(() => {
    setIsPlaying(false)
    setAudioError('Audio playback error')
  }, [])

  const startCinematicMode = useCallback(async () => {
    // Generate all audio first if not already done
    const generatedCount = panelAudioUrls.size + panels.filter(p => p.audioUrl).length
    if (generatedCount < panels.length) {
      await generateAllNarration()
    }
    
    setCurrentPanelIndex(0)
    setIsAutoPlayMode(true)
  }, [panels, panelAudioUrls.size, generateAllNarration])

  // Prefetch next panel assets
  useEffect(() => {
    if (currentPanelIndex < totalPanels - 1) {
      const nextPanel = panels[currentPanelIndex + 1]
      
      // Prefetch image
      if (nextPanel.imageUrl) {
        const img = new Image()
        img.src = nextPanel.imageUrl
      }
      
      // Prefetch audio
      const nextAudioUrl = panelAudioUrls.get(nextPanel.id) || nextPanel.audioUrl
      if (nextAudioUrl) {
        const audio = new Audio()
        audio.src = nextAudioUrl
        audio.preload = 'auto'
      }
    }
  }, [currentPanelIndex, panels, panelAudioUrls])

  // Keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (isImageExpanded || isEditingText) return
      
      // Spacebar: toggle play/pause
      if (e.code === 'Space' && currentAudioUrl) {
        e.preventDefault()
        togglePlayPause()
      }
    }
    
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [currentAudioUrl, togglePlayPause, isImageExpanded, isEditingText])

  // Auto-play audio when panel changes in auto-play mode
  useEffect(() => {
    if (isAutoPlayMode && currentAudioUrl && audioRef.current) {
      audioRef.current.src = currentAudioUrl
      audioRef.current.play().then(() => setIsPlaying(true)).catch(err => {
        console.error('Auto-play failed:', err)
        setAudioError('Auto-play failed')
        setIsAutoPlayMode(false)
      })
    }
  }, [currentPanelIndex, isAutoPlayMode, currentAudioUrl])

  // Update audio source when panel changes (manual navigation)
  useEffect(() => {
    if (audioRef.current && currentAudioUrl && !isAutoPlayMode) {
      audioRef.current.src = currentAudioUrl
      setIsPlaying(false)
    }
    // Clear error when changing panels
    setAudioError(null)
  }, [currentPanelIndex, currentAudioUrl, isAutoPlayMode])

  const handleMintWithMetadata = async () => {
    try {
      onMint(panels)
      setShowFeedback(true)
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
                {/* Image */}
                <div
                  className="w-full aspect-video overflow-hidden bg-black relative group cursor-pointer"
                  onClick={() => currentPanel.imageUrl && setIsImageExpanded(true)}
                >
                  {currentPanel.imageUrl ? (
                    <>
                      <img
                        src={currentPanel.imageUrl}
                        alt={`Panel ${currentPanelIndex + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60"></div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-200 opacity-0 group-hover:opacity-100">
                        <div className="text-white text-sm font-medium">Click to expand</div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-black">
                      <p className="text-muted-foreground">No image available</p>
                    </div>
                  )}
                </div>

                {/* Model badge and regeneration */}
                <div className="px-6 py-3 bg-black/40 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Generated with:</span>
                    <span
                      className="text-xs font-mono px-2 py-1 rounded"
                      style={{
                        backgroundColor: `${primaryColor}20`,
                        color: primaryColor,
                      }}
                    >
                      {currentPanel.imageModel}
                    </span>
                  </div>
                  {currentPanel.imageUrl && onPanelImageChange && (
                    <Button
                      onClick={() => {
                        const input = prompt('Enter custom prompt for regeneration (optional):')
                        onPanelImageChange(currentPanelIndex, input || undefined)
                      }}
                      size="sm"
                      className="bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 text-white transition-all"
                    >
                      🔄 Regenerate Image
                    </Button>
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
                            className="p-2 opacity-0 group-hover/text:opacity-100 hover:bg-purple-600/20 rounded text-purple-400 transition-opacity flex-shrink-0"
                            title="Edit narrative text"
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
                      {panel.imageUrl ? (
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
                          Panel {idx + 1}
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
              {/* Audio error indicator */}
              {audioError && (
                <span className="text-xs text-red-400 px-2 py-1 bg-red-500/10 rounded">
                  {audioError}
                </span>
              )}
              
              {/* Audio narration controls */}
              {panelAudioUrls.size === 0 && !panels.some(p => p.audioUrl) ? (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={generateAllNarration}
                  disabled={isGeneratingAudio}
                  title="Generate voice narration for all panels (Spacebar to play/pause)"
                >
                  {isGeneratingAudio ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {Math.round(audioGenerationProgress)}%
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      Narration
                    </>
                  )}
                </Button>
              ) : (
                <>
                  {/* Play/Pause current panel audio */}
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={togglePlayPause}
                    disabled={!currentAudioUrl || generatingPanelId === currentPanel?.id}
                    title={isPlaying ? 'Pause narration (Space)' : 'Play narration (Space)'}
                  >
                    {generatingPanelId === currentPanel?.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {generatingPanelId === currentPanel?.id ? 'Generating...' : isPlaying ? 'Pause' : 'Play'}
                  </Button>
                  
                  {/* Regenerate current panel audio */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => regeneratePanelAudio(currentPanelIndex)}
                    disabled={!!generatingPanelId || isAutoPlayMode}
                    title="Regenerate audio for this panel"
                  >
                    🔄
                  </Button>
                  
                  {/* Cinematic auto-play mode */}
                  <Button
                    variant={isAutoPlayMode ? 'default' : 'outline'}
                    className="gap-2"
                    onClick={() => isAutoPlayMode ? setIsAutoPlayMode(false) : startCinematicMode()}
                    disabled={isGeneratingAudio}
                    style={{
                      backgroundColor: isAutoPlayMode ? primaryColor : undefined,
                      borderColor: primaryColor,
                    }}
                    title={isAutoPlayMode ? 'Stop cinematic mode' : 'Start cinematic auto-play'}
                  >
                    {isGeneratingAudio ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isAutoPlayMode ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                    {isAutoPlayMode ? 'Stop' : 'Cinematic'}
                  </Button>
                </>
              )}
              
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
            </div>
          </div>
        </div>

        {/* Story Protocol IP Registration */}
        {showIPRegistration && nftMintedMetadata && (
          <div className="border-t border-white/10 p-4 md:p-8 bg-gradient-to-b from-black/40 via-black to-black"
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
                  gameId: gameTitle,
                  title: gameTitle,
                  description: `Interactive ${genre.toLowerCase()} comic with ${totalPanels} panels`,
                  articleUrl: articleUrl,
                  gameCreatorAddress: creatorWallet,
                  authorParagraphUsername: authorParagraphUsername,
                  authorWalletAddress: authorWallet || '',
                  genre: genre.toLowerCase() as 'horror' | 'comedy' | 'mystery',
                  difficulty: difficulty.toLowerCase() as 'easy' | 'hard',
                  gameMetadataUri: nftMintedMetadata.gameMetadataUri,
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
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
