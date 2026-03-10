'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, BookOpen, ChevronDown } from 'lucide-react'
import { ComicPanelCard } from '../comic-panel-card'
import type { Game, from '../../types'
import type { ChatEntry } from '../../hooks/use-game-session'

const MAX_COMIC_PANELS = 5

interface GameplayScreenProps {
  game: Game
  messages: ChatEntry[]
  isWaitingForResponse: boolean
  pendingOptionId: number | null
  assistantMessageCount: number
  canAddMorePanels: boolean
  userInput: string
  onUserInputChange: (value: string) => void
  onOptionClick: (optionId: number, optionText: string) => void
  onImagesReady: () => void
  onImageRegenerate: (messageId: string) => void
  messagesEndRef: React.RefObject<HTMLDivElement>
}

export function GameplayScreen({
  game,
  messages,
  isWaitingForResponse,
  pendingOptionId,
  assistantMessageCount,
  canAddMorePanels,
  userInput,
  onUserInputChange,
  onOptionClick,
  onImagesReady,
  onImageRegenerate,
  messagesEndRef,
}: GameplayScreenProps) {
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div
      className="min-h-screen w-full flex flex-col animate-fade-in mobile-optimized"
      style={{
        background: `linear-gradient(135deg, ${game.primaryColor || '#8b5cf6'}05, black)`,
      }}
    >
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          // Loading State
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="loading-spinner mx-auto" />
              <p className="text-gray-400 animate-pulse">Generating your story...</p>
            </div>
          </div>
        ) : (
          // Comic Panel Display
          <div className="w-full flex flex-col items-center justify-center min-h-full p-4 md:p-8 py-6 md:py-8 animate-slide-in">
            {/* Story Progress Bar */}
            <div className="w-full max-w-5xl mb-8 pb-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Story Progress</p>
                <p className="text-sm text-gray-500">Panel {assistantMessageCount} of {MAX_COMIC_PANELS}</p>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(assistantMessageCount / MAX_COMIC_PANELS) * 100}%`,
                    backgroundColor: game.primaryColor || '#8b5cf6',
                  }}
                />
              </div>
            </div>

            {/* Comic Panels */}
            <div className="w-full max-w-5xl space-y-6">
              {messages
                .filter((msg) => msg.role === 'assistant')
                .map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ComicPanelCard
                      narrative={msg.content}
                      options={msg.options || []}
                      imageUrl={msg.narrativeImage}
                      imageModel={msg.imageModel}
                      panelIndex={index + 1}
                      totalPanels={MAX_COMIC_PANELS}
                      primaryColor={game.primaryColor || '#8b5cf6'}
                      isWaitingForResponse={isWaitingForResponse && pendingOptionId !== null}
                      pendingOptionId={pendingOptionId}
                      onOptionClick={onOptionClick}
                      onImagesReady={onImagesReady}
                      onImageRegenerate={() => onImageRegenerate(msg.id)}
                    />
                  </motion.div>
                ))}
            </div>

            {/* Input Area */}
            {canAddMorePanels && (
              <div className="w-full max-w-5xl mt-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => onUserInputChange(e.target.value)}
                    placeholder="Type your choice or action..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    disabled={isWaitingForResponse}
                  />
                  <button
                    onClick={() => {
                      if (userInput.trim()) {
                        onOptionClick(0, userInput.trim())
                      }
                    }}
                    disabled={isWaitingForResponse || !userInput.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {isWaitingForResponse ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      'Send'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with Back Button */}
      <div className="border-t border-white/10 p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-md">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          <span>Back to Games</span>
        </button>

        {/* View & Mint Comic Button (appears after story complete) */}
        {assistantMessageCount >= MAX_COMIC_PANELS && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {/* TODO: Show comic finale */}}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>View & Mint Comic</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
