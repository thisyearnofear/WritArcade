'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, BookOpen, ChevronDown, Share2 } from 'lucide-react'
import { ComicPanelCard } from '../comic-panel-card'
import { MoodIndicator } from '@/components/game/MoodIndicator'
import type { Game, GameplayOption } from '../../types'
import type { ChatEntry } from '../../hooks/use-game-session'
import { trackEvent } from '@/lib/analytics'

const MAX_COMIC_PANELS = 5

interface GameplayScreenProps {
  game: Game
  messages: ChatEntry[]
  worldMood: { tension: number; chaos: number; hope: number }
  isWaitingForResponse: boolean
  pendingOptionId: number | null
  assistantMessageCount: number
  canAddMorePanels: boolean
  isGeneratingEpilogue: boolean
  userInput: string
  onUserInputChange: (value: string) => void
  onOptionClick: (option: GameplayOption) => void
  onImagesReady: () => void
  onImageRegenerate: (messageId: string, narrativeText: string, customPrompt?: string, theme?: string) => Promise<void>
  onImageRating: (messageId: string, rating: number) => void
  messagesEndRef: React.RefObject<HTMLDivElement>
  responseReady: { text: boolean; images: boolean }
  isRegenerating: string | null
  setShowComicFinale: (show: boolean) => void
  epilogueReflection: string | null
  epilogueGenerationFailed: boolean
  // UI Enhancements
  availableThemes: any[]
  generateAIPromptSuggestions: (content: string) => string[]
  handleAIPromptSelect: (prompt: string) => void
}

export function GameplayScreen({
  game,
  messages,
  worldMood,
  isWaitingForResponse,
  pendingOptionId,
  assistantMessageCount,
  canAddMorePanels,
  isGeneratingEpilogue,
  userInput,
  onUserInputChange,
  onOptionClick,
  onImagesReady,
  onImageRegenerate,
  onImageRating,
  messagesEndRef,
  responseReady,
  isRegenerating,
  setShowComicFinale,
  epilogueReflection,
  epilogueGenerationFailed,
  availableThemes,
  generateAIPromptSuggestions,
  handleAIPromptSelect,
}: GameplayScreenProps) {

  const handleShare = async () => {
    trackEvent('share_clicked', {
      gameSlug: game.slug,
      panelCount: assistantMessageCount,
    })

    const shareText = `I just finished a ${game.genre} comic on WritersArcade with ${assistantMessageCount} panels.`
    const shareUrl = typeof window !== 'undefined' ? window.location.href : undefined

    try {
      if (navigator?.share) {
        await navigator.share({ title: game.title, text: shareText, url: shareUrl })
        return
      }
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(`${game.title}\n${shareText}\n${shareUrl || ''}`.trim())
        return
      }
    } catch {
      // Non-fatal
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
    return () => clearTimeout(timeoutId)
  }, [messages, messagesEndRef])

  return (
    <div
      className="min-h-screen w-full flex flex-col animate-fade-in mobile-optimized relative"
      style={{
        background: `linear-gradient(135deg, ${game.primaryColor || '#8b5cf6'}05, black)`,
      }}
    >
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="loading-spinner mx-auto" />
              <p className="text-muted-foreground animate-pulse">Generating your story...</p>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center min-h-full p-4 md:p-8 py-6 md:py-8 animate-slide-in">
            {/* Story Progress Bar */}
            <div className="w-full max-w-5xl mb-8 pb-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Story Progress</p>
                <div className="flex items-center gap-4">
                  <MoodIndicator mood={worldMood} />
                  <p className="text-sm text-muted-foreground">
                    {assistantMessageCount >= MAX_COMIC_PANELS
                      ? 'Story complete'
                      : `Panel ${assistantMessageCount} of ${MAX_COMIC_PANELS}`}
                  </p>
                </div>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min((assistantMessageCount / MAX_COMIC_PANELS) * 100, 100)}%`,
                    backgroundColor: game.primaryColor || '#8b5cf6',
                  }}
                />
              </div>
            </div>

            {/* Completion banner when story is finished */}
            {!canAddMorePanels && !isGeneratingEpilogue && (
              <div className="w-full max-w-5xl mb-6">
                <div
                  className="p-4 rounded-xl border text-sm"
                  style={{
                    backgroundColor: `${game.primaryColor || '#8b5cf6'}10`,
                    borderColor: `${game.primaryColor || '#8b5cf6'}50`,
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">5 of 5 panels complete</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your story has reached its final panel. You can view the comic or head back.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowComicFinale(true)}
                      className="shrink-0 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                      style={{
                        backgroundColor: game.primaryColor || '#8b5cf6',
                      }}
                    >
                      View Comic
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Current Comic Panel */}
              <div className="w-full space-y-8">
                {messages.map((message, idx) => {
                  if (message.role !== 'assistant') return null

                  const isEpilogue = message.id.startsWith('epilogue-')

                  if (!isEpilogue) {
                    if (!message.options || message.options.length === 0) return null
                    const remainingMessages = messages.slice(idx + 1)
                    const hasLaterCompletedPanel = remainingMessages.some(m => m.role === 'assistant' && m.options && m.options.length > 0)
                    if (hasLaterCompletedPanel) return null
                  }

                  const isTerminal = !canAddMorePanels

                  const imageReady = message.narrativeImage !== undefined

                  return (
                    <div key={message.id} className="animate-in fade-in duration-700 ease-out">
                      <ComicPanelCard
                        messageId={message.id}
                        narrativeText={isEpilogue ? `Epilogue: ${message.content}` : message.content}
                        genre={game.genre}
                        primaryColor={game.primaryColor || '#8b5cf6'}
                        options={isTerminal ? [] : (message.options || [])}
                        onOptionSelect={onOptionClick}
                        isWaiting={isWaitingForResponse}
                        onImageRating={(rating) => onImageRating(message.id, rating)}
                        onImagesReady={onImagesReady}
                        onImageRegenerate={(narrativeText, customPrompt, theme) =>
                          onImageRegenerate(message.id, narrativeText, customPrompt, theme)
                        }
                        isRegenerating={isRegenerating === message.id}
                        pendingOptionId={pendingOptionId}
                        responseReady={responseReady}
                        narrativeImage={message.narrativeImage || undefined}
                        imageModel={message.imageModel}
                        shouldRevealContent={true}
                        showLoadingState={!imageReady && isWaitingForResponse}
                        availableThemes={availableThemes}
                        currentTheme={game.primaryColor || 'default'}
                        aiPromptSuggestions={generateAIPromptSuggestions(message.content)}
                        onAIPromptSelect={handleAIPromptSelect}
                        storyComplete={isTerminal}
                        isEpilogue={isEpilogue}
                      />
                    </div>
                  )
                })}
              </div>

            <div ref={messagesEndRef} className="h-8" />
          </div>
        )}
      </div>

      {/* Input/CTA Area */}
      <div
        className="border-t border-white/10 p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-md"
        style={{
          boxShadow: `0 -4px 20px ${game.primaryColor || '#8b5cf6'}10`,
        }}
      >
        <div className="w-full max-w-5xl mx-auto">
            {!canAddMorePanels && !isGeneratingEpilogue && (
              <div className="p-4 rounded-xl border text-sm sm:text-base" style={{ backgroundColor: `${game.primaryColor || '#8b5cf6'}10`, borderColor: game.primaryColor || '#8b5cf6' }}>
                <p className="font-semibold text-white">Story Complete</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Your story has concluded. View your comic and its reflection.
                </p>
              </div>
            )}

          {isGeneratingEpilogue && (
            <div className="p-5 rounded-xl border-2 text-sm text-center" style={{ backgroundColor: `${game.primaryColor || '#8b5cf6'}10`, borderColor: game.primaryColor || '#8b5cf6' }}>
              <div className="loading-spinner mx-auto mb-3 w-6 h-6" />
              <p className="font-semibold text-white">Weaving your story's reflection...</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Generating epilogue and connecting your choices to the source article.</p>
            </div>
          )}

          {epilogueGenerationFailed && (
            <div className="p-4 rounded-xl border text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.3)' }}>
              <p className="font-semibold text-red-300">Reflection unavailable</p>
              <p className="text-xs text-muted-foreground mt-1">
                Couldn't generate an epilogue this time. Your comic is still ready to view.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
              <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className="w-3.5 h-3.5" />
                Back to Games
              </button>
              {!canAddMorePanels && !isGeneratingEpilogue ? (
                <>
                  <button onClick={handleShare} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button onClick={() => setShowComicFinale(true)} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors" style={{ backgroundColor: game.primaryColor || '#8b5cf6' }}>
                    <BookOpen className="w-4 h-4" />
                    View Comic
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

