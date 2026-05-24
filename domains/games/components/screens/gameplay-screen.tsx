'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, BookOpen, ChevronDown } from 'lucide-react'
import { ComicPanelCard } from '../comic-panel-card'
import { MoodIndicator } from '@/components/game/MoodIndicator'
import { ModelSelector } from '@/components/game/ModelSelector'
import type { Game, GameplayOption } from '../../types'
import type { ChatEntry } from '../../hooks/use-game-session'

const MAX_COMIC_PANELS = 5

interface GameplayScreenProps {
  game: Game
  messages: ChatEntry[]
  worldMood: { tension: number; chaos: number; hope: number }
  isWaitingForResponse: boolean
  pendingOptionId: number | null
  assistantMessageCount: number
  canAddMorePanels: boolean
  userInput: string
  onUserInputChange: (value: string) => void
  onOptionClick: (option: GameplayOption) => void
  onImagesReady: () => void
  onImageRegenerate: (messageId: string, narrativeText: string, customPrompt?: string) => Promise<void>
  onImageRating: (messageId: string, rating: number) => void
  messagesEndRef: React.RefObject<HTMLDivElement>
  responseReady: { text: boolean; images: boolean }
  isRegenerating: string | null
  setShowComicFinale: (show: boolean) => void
  // UI Enhancements
  availableThemes: any[]
  handleThemeSelect: (theme: string) => void
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
  availableThemes,
  handleThemeSelect,
  generateAIPromptSuggestions,
  handleAIPromptSelect,
}: GameplayScreenProps) {

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
      {/* Fixed Settings Button - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <ModelSelector />
      </div>

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
                  <p className="text-sm text-muted-foreground">Panel {assistantMessageCount} of {MAX_COMIC_PANELS}</p>
                </div>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(assistantMessageCount / MAX_COMIC_PANELS) * 100}%`,
                    backgroundColor: game.primaryColor || '#8b5cf6',
                  }}
                />
              </div>
            </div>

            {/* Current Comic Panel */}
            <div className="w-full space-y-8">
              {messages.map((message, idx) => {
                if (message.role !== 'assistant' || !message.options || message.options.length === 0) {
                  return null
                }

                const remainingMessages = messages.slice(idx + 1)
                const hasLaterCompletedPanel = remainingMessages.some(m => m.role === 'assistant' && m.options && m.options.length > 0)

                if (hasLaterCompletedPanel) return null

                const imageReady = message.narrativeImage !== undefined

                return (
                  <div key={message.id} className="animate-in fade-in duration-700 ease-out">
                    <ComicPanelCard
                      messageId={message.id}
                      narrativeText={message.content}
                      genre={game.genre}
                      primaryColor={game.primaryColor || '#8b5cf6'}
                      options={message.options || []}
                      onOptionSelect={onOptionClick}
                      isWaiting={isWaitingForResponse}
                      onImageRating={(rating) => onImageRating(message.id, rating)}
                      onImagesReady={onImagesReady}
                      onImageRegenerate={(narrativeText, customPrompt) =>
                        onImageRegenerate(message.id, narrativeText, customPrompt)
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
                      onThemeSelect={handleThemeSelect}
                      aiPromptSuggestions={generateAIPromptSuggestions(message.content)}
                      onAIPromptSelect={handleAIPromptSelect}
                      showAIPromptSuggestions={true}
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
          {!canAddMorePanels && (
            <div className="space-y-4">
              <div
                className="p-5 rounded-xl border-2 text-sm"
                style={{
                  backgroundColor: `${game.primaryColor || '#8b5cf6'}10`,
                  borderColor: game.primaryColor || '#8b5cf6',
                }}
              >
                <p className="font-semibold text-white">Story Complete</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your {MAX_COMIC_PANELS}-panel adventure has concluded. View and mint your comic as an NFT.
                </p>
              </div>
              <button
                onClick={() => setShowComicFinale(true)}
                className="w-full h-12 font-semibold transition-all duration-200 hover:shadow-lg bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: game.primaryColor || '#8b5cf6',
                }}
              >
                <BookOpen className="w-5 h-5 mr-2" />
                View & Mint Comic
              </button>
            </div>
          )}

          <button
            onClick={() => window.history.back()}
            className="mt-4 flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Back to Games</span>
          </button>
        </div>
      </div>
    </div>
  )
}

