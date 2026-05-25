'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ZoomIn, Loader2, RefreshCw, ChevronDown, ChevronUp, Sparkles, Lightbulb, Pencil, X, Check } from 'lucide-react'
import { GameplayOption } from '../types'
import { parsePanel } from '../utils/text-parser'
import { ImageGenerationResult } from '../services/image-generation.service'
import { ImageLightbox } from './image-lightbox'
import { AnimatedOptionButton } from './animated-option-button'
import { StreamingTypewriter } from '@/components/effects'
import { Button } from '@/components/ui/button'

interface ImageVersion {
  url: string | null
  model: string
  timestamp: number
}

interface ComicPanelCardProps {
  messageId: string
  narrativeText: string
  genre?: string
  _genre?: string
  primaryColor: string
  options: GameplayOption[]
  onOptionSelect: (option: GameplayOption) => void
  isWaiting: boolean
  onImageGenerated?: (result: ImageGenerationResult) => void
  onImageRating?: (rating: number) => void
  onImagesReady?: () => void
  _onImagesReady?: () => void
  onImageRegenerate?: (narrativeText: string, customPrompt?: string, theme?: string) => Promise<void>
  pendingOptionId?: number | null
  responseReady?: { text: boolean; images: boolean }
  narrativeImage?: string | null
  imageModel?: string
  shouldRevealContent?: boolean
  showLoadingState?: boolean
  isRegenerating?: boolean
  maxRegenerations?: number
  availableThemes?: Array<{
    name: string
    value: string
    label: string
    description: string
  }>
  currentTheme?: string
  // Enhanced with AI prompt suggestions
  aiPromptSuggestions?: string[]
  onAIPromptSelect?: (prompt: string) => void
  showAIPromptSuggestions?: boolean
}

export function ComicPanelCard({
  messageId,
  narrativeText,
  _genre,
  primaryColor,
  options,
  onOptionSelect,
  isWaiting,
  onImageRating,
  _onImagesReady,
  onImageRegenerate,
  pendingOptionId,
  narrativeImage,
  imageModel,
  shouldRevealContent = true,
  showLoadingState = false,
  isRegenerating = false,
  maxRegenerations = 3,
  availableThemes,
  currentTheme,
  aiPromptSuggestions,
  onAIPromptSelect,
  showAIPromptSuggestions,
}: ComicPanelCardProps) {
  const { narrative, options: parsedOptions } = parsePanel(narrativeText)
  const [imageRating, setImageRating] = useState<number | null>(null)
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [isCustomPromptMode, setIsCustomPromptMode] = useState(false)
  const [imageHistory, setImageHistory] = useState<ImageVersion[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0)
  const [showImageComparison, setShowImageComparison] = useState(false)
  const [regenerationCount, setRegenerationCount] = useState(0)
  const [revealAnimation, setRevealAnimation] = useState(false)
  const messageIdRef = useRef(messageId)

  const [localTheme, setLocalTheme] = useState(currentTheme)
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const [isEditingNarrative, setIsEditingNarrative] = useState(false)
  const [editedNarrative, setEditedNarrative] = useState(narrative)

  // Font loading gate
  useEffect(() => {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => setFontsLoaded(true))
    } else {
      setFontsLoaded(true)
    }
  }, [])

  useEffect(() => {
    setEditedNarrative(narrative)
  }, [narrative])

  // Reset rating and trigger reveal animation when messageId changes
  useEffect(() => {
    if (messageIdRef.current !== messageId) {
      messageIdRef.current = messageId
      setImageRating(null)
      setRevealAnimation(true)
      // Reset regeneration state for new panel
      setImageHistory([])
      setCurrentImageIndex(0)
      setShowImageComparison(false)
      setRegenerationCount(0)
    }
  }, [messageId])

  // Trigger reveal animation when content should be shown
  useEffect(() => {
    if (shouldRevealContent) {
      setRevealAnimation(true)
    }
  }, [shouldRevealContent])

  // Initialize image history when narrativeImage changes
  useEffect(() => {
    if (narrativeImage && imageHistory.length === 0) {
      setImageHistory([{
        url: narrativeImage,
        model: imageModel || 'unknown',
        timestamp: Date.now()
      }])
    }
  }, [narrativeImage, imageModel, imageHistory.length])

  const handleRating = (rating: number) => {
    setImageRating(rating)
    onImageRating?.(rating)
  }

  const choiceOptions = parsedOptions.length > 0 ? parsedOptions : options.map(o => o.text)

  const handleImageExpand = () => {
    setIsImageExpanded(true)
  }

  const canRegenerate = regenerationCount < maxRegenerations

  const handleImageRegeneration = async (customPromptText?: string) => {
    if (!canRegenerate || !onImageRegenerate) return
    setRegenerationCount(prev => prev + 1)
    setShowPrompt(false)
    setIsCustomPromptMode(false)
    
    const promptToUse = customPromptText && customPromptText.trim() ? customPromptText.trim() : undefined
    await onImageRegenerate(narrative, promptToUse, localTheme)
  }

  const handleRegenerateWithPrompt = () => {
    const promptToUse = isCustomPromptMode && customPrompt.trim() ? customPrompt.trim() : undefined
    handleImageRegeneration(promptToUse)
  }

  const handleRegenerateQuick = () => {
    handleImageRegeneration()
  }

  const selectImage = (index: number) => {
    setCurrentImageIndex(index)
    setShowImageComparison(false)
  }

  return (
    <>
      <ImageLightbox
        isOpen={isImageExpanded}
        imageUrl={narrativeImage || null}
        imageModel={imageModel}
        narrativeText={narrative}
        primaryColor={primaryColor}
        onClose={() => setIsImageExpanded(false)}
      />
      <div className="w-full max-w-7xl mx-auto">
        {/* Comic Panel Container - Stacked layout with full-width image - Enhanced */}
        <div
          className="rounded-lg shadow-2xl overflow-hidden transition-all duration-500 ease-out card-enhanced"
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            border: `3px solid ${primaryColor}`,
            boxShadow: `0 20px 40px rgba(0,0,0,0.6), 0 0 20px ${primaryColor}20`,
          }}
        >
          {/* Image Section - Full Width */}
          <div className="w-full bg-black relative overflow-hidden group">
            {/* Comic book frame effect */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${primaryColor}08 50%, transparent 100%)`,
              }}
            />

            {/* Image container - responsive height with better mobile scaling */}
            {/* P0: Optimistic space reservation - use aspect-ratio + min-height to prevent CLS */}
            <div 
              className="w-full min-h-[192px] md:min-h-[256px] lg:min-h-[384px] overflow-hidden cursor-pointer relative"
              style={{ aspectRatio: '16/9' }}
              onClick={handleImageExpand}
            >
              {/* P0: Show skeleton until image is confirmed loaded */}
              {(!narrativeImage || isRegenerating) && (
                <div className="absolute inset-0 bg-card animate-pulse" />
              )}
              {imageHistory.length > 0 && imageHistory[currentImageIndex]?.url ? (
                <>
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={imageHistory[currentImageIndex].url}
                      src={imageHistory[currentImageIndex].url}
                      alt="Story panel"
                      className={`w-full h-full object-cover transition-opacity duration-300 ${isRegenerating ? 'opacity-60' : 'group-hover:scale-105'}`}
                      initial={{ clipPath: 'inset(0 100% 0 0)' }}
                      animate={{ clipPath: 'inset(0 0% 0 0)' }}
                      exit={{ clipPath: 'inset(0 0 0 100%)' }}
                      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
                    />
                  </AnimatePresence>
                  {/* Subtle vignette overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 pointer-events-none" />

                  {/* Expand button overlay with enhanced micro-interaction */}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleImageExpand()
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    aria-label="Expand image"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <motion.div
                      className="p-3 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                      whileHover={{ rotate: 5 }}
                      whileTap={{ rotate: 0, scale: 0.9 }}
                    >
                      <ZoomIn className="w-5 h-5" style={{ color: primaryColor }} />
                    </motion.div>
                  </motion.button>

                  {/* Info badges */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    {/* Model badge */}
                    <span className="text-xs font-mono px-3 py-1.5 rounded-md bg-black/85 text-white/80 backdrop-blur-sm border border-white/10">
                      {imageModel || 'unknown'}
                    </span>
                    {/* Regenerate button with attempt counter */}
                      {onImageRegenerate && (
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRegenerateQuick()
                          }}
                          disabled={isRegenerating || isWaiting || !canRegenerate}
                          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md ${
                            canRegenerate 
                              ? 'bg-purple-600/80 hover:bg-purple-500 text-white' 
                              : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                          } backdrop-blur-sm border border-purple-400/30 transition-all disabled:opacity-50`}
                          whileHover={canRegenerate ? { scale: 1.05 } : {}}
                          whileTap={canRegenerate ? { scale: 0.95 } : {}}
                          title={canRegenerate ? 'Regenerate image' : `Max ${maxRegenerations} attempts used`}
                        >
                          <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                          <span>
                            {isRegenerating ? 'Regenerating...' : `New (${regenerationCount}/${maxRegenerations})`}
                          </span>
                        </motion.button>
                      )}
                  </div>

                  {/* Theme Selector */}
                  {availableThemes && availableThemes.length > 0 && (
                    <div className="absolute top-4 right-4 z-20">
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-1"
                      >
                        <select
                          value={localTheme}
                          onChange={(e) => setLocalTheme(e.target.value)}
                          className="bg-transparent text-white text-xs px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                          title="Select visual theme"
                        >
                          {availableThemes.map((theme: { value: string, label: string }) => (
                            <option key={theme.value} value={theme.value} className="bg-card text-white">
                              {theme.label}
                            </option>
                          ))}
                        </select>
                      </motion.div>
                    </div>
                  )}

                  {/* Loading overlay during regeneration */}
                  {isRegenerating && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    >
                      <div className="text-center space-y-2">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: primaryColor }} />
                        <p className="text-white text-sm font-medium">
                          Generating attempt {regenerationCount + 1}...
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {maxRegenerations - regenerationCount} {maxRegenerations - regenerationCount === 1 ? 'attempt' : 'attempts'} remaining
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Rating stars - right side with better mobile touch targets */}
                  <div className="absolute top-4 right-4 flex gap-1 bg-black/70 px-3 py-1.5 rounded-md backdrop-blur-sm border border-white/10">
                    {!imageRating ? (
                      <>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRating(star)}
                            className="text-lg sm:text-base hover:scale-125 transition-all duration-200 cursor-pointer text-white/50 hover:text-white p-1"
                            aria-label={`Rate ${star} stars`}
                          >
                            ☆
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className="text-lg sm:text-base transition-colors duration-300"
                            style={{ color: star <= imageRating ? primaryColor : 'rgba(64,64,64,0.5)' }}
                          >
                            ★
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </>
              ) : showLoadingState ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-black relative">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: primaryColor }} />
                    <p className="text-muted-foreground text-sm">Preparing next panel...</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-black relative">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: primaryColor }} />
                    <p className="text-muted-foreground text-sm">Generating visual...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prompt Visibility Panel - Collapsible */}
          {onImageRegenerate && narrativeImage && (
            <div className="border-t border-white/10">
              <button
                onClick={() => setShowPrompt(!showPrompt)}
                className="w-full px-4 py-2 flex items-center justify-between text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  {showPrompt ? 'Hide Prompt' : 'View/Edit Prompt'}
                </span>
                {showPrompt ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <AnimatePresence>
                {showPrompt && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      <div className="text-xs text-muted-foreground mb-2">
                        This prompt was used to generate the image. You can modify it and regenerate.
                      </div>

                      {/* Toggle between viewing and editing */}
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => {
                            setIsCustomPromptMode(false)
                            setCustomPrompt('')
                          }}
                          className={`px-2 py-1 text-xs rounded ${!isCustomPromptMode ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                        >
                          Original
                        </button>
                        <button
                          onClick={() => {
                            setIsCustomPromptMode(true)
                            if (!customPrompt) setCustomPrompt(narrative)
                          }}
                          className={`px-2 py-1 text-xs rounded ${isCustomPromptMode ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                        >
                          Custom
                        </button>
                      </div>

                      {isCustomPromptMode ? (
                        <textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          className="w-full bg-card border border-purple-500/50 rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[100px] resize-y"
                          placeholder="Enter your custom prompt..."
                        />
                      ) : (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground border border-border/50">
                          {narrative}
                        </div>
                      )}

                      <button
                        onClick={handleRegenerateWithPrompt}
                        disabled={isRegenerating || isWaiting}
                        className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                        {isRegenerating ? 'Regenerating...' : isCustomPromptMode ? 'Regenerate with Custom Prompt' : 'Regenerate Image'}
                      </button>

                      {/* AI Prompt Suggestions - Enhanced Feature */}
                      {showAIPromptSuggestions && aiPromptSuggestions && aiPromptSuggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Lightbulb className="w-3 h-3 text-yellow-400" />
                            <span>AI Suggestions</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                            {aiPromptSuggestions.map((suggestion: string, index: number) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setCustomPrompt(suggestion)
                                  setIsCustomPromptMode(true)
                                  onAIPromptSelect?.(suggestion)
                                }}
                                className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground p-2 rounded border border-border transition-colors text-left line-clamp-2"
                                title="Use this AI-generated prompt"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Content Section - Full Width Below Image */}
          <div className="w-full p-6 lg:p-8 flex flex-col gap-6 bg-gradient-to-b from-black/30 to-black/10">

            {/* Narrative Text */}
            <div className="flex flex-col min-h-24">
              {/* Subtle label */}
              <div className="mb-3 pb-3 border-b" style={{ borderColor: `${primaryColor}30` }}>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Scene</span>
              </div>

            {/* Main narrative - with typewriter reveal */}
            <div className="group/narrative relative min-h-[4rem]">
              {isEditingNarrative ? (
                <div className="space-y-2">
                  <textarea
                    value={editedNarrative}
                    onChange={(e) => setEditedNarrative(e.target.value)}
                    className="w-full bg-card border border-purple-500/50 rounded-lg p-3 text-sm lg:text-base text-foreground focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[100px] resize-y"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingNarrative(false)
                        setEditedNarrative(narrative)
                      }}
                      className="h-8 text-xs border-white/20"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        // In a real app we'd trigger an update, here we just show the change
                        setIsEditingNarrative(false)
                      }}
                      className="h-8 text-xs bg-green-600 hover:bg-green-500"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Apply
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="flex-1 font-serif text-base lg:text-lg leading-relaxed text-foreground">
                    {fontsLoaded ? (
                      <StreamingTypewriter 
                        key={`${messageId}-${narrative}`}
                        text={editedNarrative} 
                        speed={40}
                      />
                    ) : (
                      <span className="opacity-0">{editedNarrative}</span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsEditingNarrative(true)}
                    className="p-2 opacity-0 group-hover/narrative:opacity-100 hover:bg-white/10 rounded-full transition-opacity flex-shrink-0"
                    title="Edit narrative"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
            </div>

            {/* Choice Options - Spanning Full Width Below */}
            {choiceOptions.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="pt-2 border-t" style={{ borderColor: `${primaryColor}30` }}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                    Your next move
                  </h4>

                  {/* Grid layout - 1 col on mobile, 2 on tablet, 4 on desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {choiceOptions.map((option, idx) => {
                      const optionId = idx + 1
                      return (
                        <AnimatedOptionButton
                          key={idx}
                          option={option}
                          optionId={optionId}
                          isSelected={pendingOptionId === optionId}
                          isWaiting={isWaiting}
                          primaryColor={primaryColor}
                          disabled={isWaiting}
                          onClick={() => onOptionSelect({ id: optionId, text: option })}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
            </div>
            </div>
            </div>

            {/* Image Comparison Modal */}
            <AnimatePresence>
            {showImageComparison && imageHistory.length > 1 && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowImageComparison(false)}
            >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-white/10 rounded-xl overflow-hidden w-full max-w-5xl max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10 bg-black/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Choose Your Image</h3>
                  <button
                    onClick={() => setShowImageComparison(false)}
                    className="text-muted-foreground hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {imageHistory.length} version{imageHistory.length !== 1 ? 's' : ''} generated
                </p>
              </div>

              {/* Image Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {imageHistory.map((version, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => selectImage(idx)}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                        currentImageIndex === idx
                          ? 'border-purple-500 shadow-lg shadow-purple-500/50'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                      whileHover={{ scale: 1.02 }}
                    >
                      <img
                        src={version.url || ''}
                        alt={`Attempt ${idx + 1}`}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <div className="text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white font-semibold">Attempt {idx + 1}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {idx === 0 ? 'Original' : `Retry ${idx}`}
                          </p>
                        </div>
                      </div>
                      {/* Model badge */}
                      <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white/80">
                        {version.model}
                      </div>
                      {/* Selection indicator */}
                      {currentImageIndex === idx && (
                        <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 bg-black/50 flex gap-3">
                <button
                  onClick={() => setShowImageComparison(false)}
                  className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Keep Selected
                </button>
                {canRegenerate && (
                  <button
                    onClick={handleRegenerateQuick}
                    disabled={isRegenerating}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                    {isRegenerating ? 'Generating...' : 'Try Again'}
                  </button>
                )}
              </div>
            </motion.div>
            </motion.div>
            )}
            </AnimatePresence>
            </>
            )
            }
