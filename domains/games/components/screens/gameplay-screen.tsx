'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, ChevronDown, Share2, Sparkles } from 'lucide-react'
import { ComicPanelCard } from '../comic-panel-card'
import { MoodIndicator } from '@/components/game/MoodIndicator'
import { DailyModifierStrip } from '@/components/daily-challenge/daily-modifier-strip'
import { EpilogueGoalStrip } from '@/components/game/epilogue-goal-strip'
import { FinaleUnlocksStrip } from '@/components/game/finale-unlocks-strip'
import { getModifierCategoryForPanel } from '@/lib/daily-challenge-ui'
import type { Game, GameplayOption } from '../../types'
import type { ChatEntry } from '../../hooks/use-game-session'
import { trackEvent } from '@/services/analytics'

 
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
  availableThemes: Array<{ name: string; value: string; label: string; description: string }>
  generateAIPromptSuggestions: (content: string) => string[]
  handleAIPromptSelect: (prompt: string) => void
  embedded?: boolean
  isDailyActive?: boolean
  hasSecretEpilogue?: boolean
  hasMintedNft?: boolean
  /** Extra card rendered at the top of the desktop sidebar (e.g. daily Hidden Hand teaser). */
  sidebarExtra?: React.ReactNode
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userInput,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUserInputChange,
  onOptionClick,
  onImagesReady,
  onImageRegenerate,
  onImageRating,
  messagesEndRef,
  responseReady,
  isRegenerating,
  setShowComicFinale,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  epilogueReflection,
  epilogueGenerationFailed,
   
  availableThemes,
   
  generateAIPromptSuggestions,
   
  handleAIPromptSelect,
  embedded = false,
  isDailyActive = false,
  hasSecretEpilogue = false,
  hasMintedNft = false,
  sidebarExtra,
}: GameplayScreenProps) {

  const handleShare = useCallback(async () => {
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
  }, [game.slug, game.title, game.genre, assistantMessageCount])

  const handleViewComic = useCallback(() => {
    trackEvent('view_comic_clicked', {
      gameSlug: game.slug,
      panelCount: assistantMessageCount,
    })
    setShowComicFinale(true)
  }, [game.slug, assistantMessageCount, setShowComicFinale])

  const router = useRouter()

  // Keyboard shortcuts: 1/2/3 for choices, V for comic, S for share
  useEffect(() => {
    const activeAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.options?.length)
    const options = activeAssistant?.options ?? []

    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const key = parseInt(e.key)
      if (key >= 1 && key <= 3 && options[key - 1]) {
        onOptionClick(options[key - 1])
        return
      }
      if (e.key === 'v' || e.key === 'V') handleViewComic()
      if (e.key === 's' || e.key === 'S') handleShare()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [messages, onOptionClick, handleShare, handleViewComic])

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
          <div className="w-full flex flex-col lg:grid lg:grid-cols-[280px_1fr] lg:gap-8 min-h-full p-4 md:p-8 py-6 md:py-8 animate-slide-in">
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex lg:flex-col gap-6 sticky top-24 h-fit">
              {sidebarExtra}
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <h3 className="text-sm font-bold text-white mb-3">Story Progress</h3>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${Math.min((assistantMessageCount / MAX_COMIC_PANELS) * 100, 100)}%`,
                      backgroundColor: game.primaryColor || '#8b5cf6',
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {assistantMessageCount >= MAX_COMIC_PANELS ? 'Story complete' : `Panel ${assistantMessageCount} of ${MAX_COMIC_PANELS}`}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <h3 className="text-sm font-bold text-white mb-2">World Mood</h3>
                <MoodIndicator mood={worldMood} />
                <p className="text-xs text-muted-foreground mt-2">
                  Your choices shift the story's emotional tone.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <h3 className="text-sm font-bold text-white mb-2">Keyboard Shortcuts</h3>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white/70 mr-1">1-3</kbd>
                    Choose option
                  </li>
                  <li>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white/70 mr-1">V</kbd>
                    View comic
                  </li>
                  <li>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white/70 mr-1">S</kbd>
                    Share
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <h3 className="text-sm font-bold text-white mb-3">Story Map</h3>
                <div className="flex flex-wrap gap-2">
                  {messages.filter(m => m.role === 'assistant').map((m, idx) => (
                    <div
                      key={m.id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                        idx === assistantMessageCount - 1
                          ? 'bg-white/20 border-white/40 text-white'
                          : 'bg-white/5 border-white/10 text-muted-foreground'
                      }`}
                    >
                      {idx + 1}
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <main className="flex flex-col items-center w-full lg:col-span-1">
            {isDailyActive && (
              <DailyModifierStrip
                panelIndex={Math.max(0, assistantMessageCount - 1)}
                primaryColor={game.primaryColor}
              />
            )}
            {hasSecretEpilogue && (
              <EpilogueGoalStrip
                panelsDone={assistantMessageCount}
                hasSecretEpilogue={hasSecretEpilogue}
                hasMintedNft={hasMintedNft}
                primaryColor={game.primaryColor}
              />
            )}
            <FinaleUnlocksStrip
              panelsDone={assistantMessageCount}
              primaryColor={game.primaryColor}
            />
            {/* Story Progress Bar */}
            <div className="w-full max-w-5xl mb-8 pb-6 border-b border-white/10 lg:hidden">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Story Progress</p>
                <div className="flex items-center gap-4">
                  <MoodIndicator mood={worldMood} />
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border"
                    style={{
                      borderColor: assistantMessageCount >= MAX_COMIC_PANELS
                        ? '#10b981'
                        : (game.primaryColor || '#8b5cf6') + '60',
                      backgroundColor: assistantMessageCount >= MAX_COMIC_PANELS
                        ? 'rgba(16, 185, 129, 0.15)'
                        : (game.primaryColor || '#8b5cf6') + '15',
                      color: assistantMessageCount >= MAX_COMIC_PANELS ? '#10b981' : (game.primaryColor || '#8b5cf6'),
                    }}
                  >
                    {assistantMessageCount >= MAX_COMIC_PANELS ? '✓' : `${assistantMessageCount}/${MAX_COMIC_PANELS}`}
                    <span>{assistantMessageCount >= MAX_COMIC_PANELS ? 'Story complete' : 'panels'}</span>
                  </div>
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
                  const panelIndex = messages
                    .slice(0, idx + 1)
                    .filter(m => m.role === 'assistant' && !m.id.startsWith('epilogue-')).length - 1

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
                        dailyModifierCategory={
                          isDailyActive && !isEpilogue && panelIndex >= 0
                            ? getModifierCategoryForPanel(panelIndex)
                            : undefined
                        }
                      />
                    </div>
                  )
                })}
              </div>

            <div ref={messagesEndRef} className="h-8" />
          </main>
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
              {embedded ? (
                !canAddMorePanels ? (
                  <a
                    href={`/generate?utm_source=embed&utm_campaign=${encodeURIComponent(game.slug)}&ref=embed_end`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black hover:bg-white/90 transition-colors shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    Turn any article into a game
                  </a>
                ) : (
                  <a
                    href={`/games/${game.slug}?utm_source=embed&utm_campaign=${game.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    Open on WritersArcade
                  </a>
                )
              ) : (
                <button onClick={() => router.push('/games')} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className="w-3.5 h-3.5" />
                  Back to Games
                </button>
              )}
              {!canAddMorePanels && !isGeneratingEpilogue ? (
                <>
                  <button onClick={handleShare} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                    <button onClick={handleViewComic} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors" style={{ backgroundColor: game.primaryColor || '#8b5cf6' }}>
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

