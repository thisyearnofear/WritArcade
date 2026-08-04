'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Pencil, X } from 'lucide-react'
import { ImageLightbox } from './image-lightbox'
import { StreamingTypewriter, PretextContainer } from '@/components/effects'
import type { useVideoMotion } from './finale-video-motion'
import type { ComicBookFinalePanelData } from './comic-book-finale'

interface SinglePanelViewProps {
  panels: ComicBookFinalePanelData[]
  currentPanelIndex: number
  setCurrentPanelIndex: (index: number) => void
  primaryColor: string
  fontsLoaded: boolean
  onPanelTextChange?: (panelIndex: number, newText: string) => void
  onPanelImageChange?: (panelIndex: number, customPrompt?: string) => void
  regeneratingMessageId?: string | null
  getPanelVideo: ReturnType<typeof useVideoMotion>['getPanelVideo']
}

export function SinglePanelView({
  panels,
  currentPanelIndex,
  setCurrentPanelIndex,
  primaryColor,
  fontsLoaded,
  onPanelTextChange,
  onPanelImageChange,
  regeneratingMessageId,
  getPanelVideo,
}: SinglePanelViewProps) {
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [isEditingText, setIsEditingText] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')

  const currentPanel = panels[currentPanelIndex]
  const totalPanels = panels.length

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

  return (
    <>
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
                <PretextContainer
                  text={currentPanel.narrativeText}
                  maxWidth={800}
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

      {/* Navigation controls */}
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
    </>
  )
}
