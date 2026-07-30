'use client'

import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'

import type { Game } from '../types'
import { useGameSession } from '../hooks/use-game-session'
import { trackEvent } from '@/services/analytics'
import { GameplayScreen } from './screens/gameplay-screen'

const MAX_COMIC_PANELS = 5

interface EmbedGamePlayerProps {
  game: Game
}

/**
 * Wallet-free player for /embed/[slug] iframes.
 * No wagmi, no mint/IP chrome — play, choose, complete, link out.
 */
export function EmbedGamePlayer({ game }: EmbedGamePlayerProps) {
  // ?ref= must be read client-side: the page is ISR-cached and
  // server searchParams would force dynamic rendering.
  const [embedRef, setEmbedRef] = useState<string | undefined>(undefined)
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) setEmbedRef(ref.slice(0, 200))
  }, [])

  const session = useGameSession(game, { embedded: true, ref: embedRef })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Track story completion once when the player reaches the end.
  // Kept in an effect to avoid reading/writing a ref during render.
  const hasTrackedCompletion = useRef(false)
  useEffect(() => {
    if (hasTrackedCompletion.current) return

    const storyComplete =
      !!session.epilogueReflection || session.assistantMessageCount >= MAX_COMIC_PANELS
    if (!storyComplete) return

    hasTrackedCompletion.current = true

    trackEvent('story_completed', {
      gameSlug: game.slug,
      panelCount: session.assistantMessageCount,
      maxPanels: MAX_COMIC_PANELS,
      embedded: true,
    })

    fetch(`/api/games/${game.slug}/play`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.sessionId }),
    }).catch(() => {
      // Non-critical — don't block the user if this fails
    })
  }, [game.slug, session.assistantMessageCount, session.epilogueReflection, session.sessionId])

  const openFullExperience = () => {
    window.open(
      `/games/${game.slug}?utm_source=embed&utm_campaign=${game.slug}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  // HERO — minimal start card
  if (!session.isPlaying) {
    return (
      <div
        className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-10 text-center"
        style={{ background: `linear-gradient(135deg, ${game.primaryColor || '#8b5cf6'}15, black)` }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {game.genre}{game.subgenre ? ` · ${game.subgenre}` : ''}
        </p>
        <h1 className="mt-3 max-w-xl text-2xl font-bold text-white sm:text-3xl">{game.title}</h1>
        {game.tagline && (
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{game.tagline}</p>
        )}
        <button
          onClick={() => {
            trackEvent('play_clicked', { surface: 'embed', gameSlug: game.slug, mode: 'story' })
            session.startGame()
          }}
          disabled={session.isStarting}
          className="mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-3 text-base font-semibold text-white transition-transform hover:scale-105 disabled:opacity-60"
          style={{ backgroundColor: game.primaryColor || '#8b5cf6' }}
        >
          {session.isStarting ? (
            <>
              <span className="loading-spinner h-4 w-4" />
              {session.loadingProgress.text ? 'Drawing panels...' : 'Starting story...'}
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Play
            </>
          )}
        </button>
        <p className="mt-4 text-xs text-muted-foreground">
          {MAX_COMIC_PANELS} panels · your choices shape the story
        </p>
      </div>
    )
  }

  // GAMEPLAY — same screen, embed chrome ("View Comic" links out instead of the mint finale)
  return (
    <GameplayScreen
      game={game}
      messages={session.messages}
      isWaitingForResponse={session.isWaitingForResponse}
      pendingOptionId={session.pendingOptionId}
      assistantMessageCount={session.assistantMessageCount}
      canAddMorePanels={session.canAddMorePanels}
      isGeneratingEpilogue={session.isGeneratingEpilogue}
      epilogueReflection={session.epilogueReflection}
      epilogueGenerationFailed={session.epilogueGenerationFailed}
      userInput=""
      onUserInputChange={() => {}}
      onOptionClick={(option) => session.handleOptionClick(option.id, option.text)}
      onImagesReady={session.handleImagesReady}
      onImageRegenerate={session.handleImageRegenerate}
      onImageRating={session.handleImageRating}
      messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
      responseReady={session.responseReady}
      worldMood={session.worldMood}
      isRegenerating={session.regeneratingMessageId}
      setShowComicFinale={openFullExperience}
      availableThemes={[]}
      generateAIPromptSuggestions={() => []}
      handleAIPromptSelect={() => {}}
      embedded
    />
  )
}
