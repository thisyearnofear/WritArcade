'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAccount } from 'wagmi'

import { Game } from '../types'
import { useGameSession } from '../hooks/use-game-session'
import { useGameBlockchain } from '../hooks/use-game-blockchain'
import { useDailyChallengeOnchain } from '@/hooks/use-daily-challenge-onchain'
import { getSecretPanelStatus } from '@/lib/secret-panel-status'
import { config } from '@/lib/config'
import { trackEvent } from '@/services/analytics'
import { useRecentlyPlayed } from '@/hooks/use-recently-played'

// Screen Components
import { HeroScreen } from './screens/hero-screen'
import { GameplayScreen } from './screens/gameplay-screen'
import { ComicFinaleScreen } from './screens/comic-finale-screen'
import { GameStatusScreens } from './screens/game-status-screens'
import { GameEnrichment } from './game-enrichment'
import { HiddenHandTeaser } from './hidden-hand-teaser'

interface GamePlayInterfaceProps {
  game: Game
  isOwner?: boolean
}

const MAX_COMIC_PANELS = 5

export function GamePlayInterface({ game, isOwner = false }: GamePlayInterfaceProps) {
  const [liveGame, setLiveGame] = useState(game)
  const { trackPlay } = useRecentlyPlayed()

  useEffect(() => {
    setLiveGame(game)
  }, [game])

  // Account hook kept for potential future features
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const account = useAccount()

  // 1. Daily state is resolved before the session so analytics can use the
  // explicit active mode rather than inferring it from localStorage.
  const dailyChallenge = useDailyChallengeOnchain()
  const isDailyGame = config.features.dailyChallenge && dailyChallenge.isActive

  // 2. Session & Gameplay Logic
  const session = useGameSession(liveGame, { isDailyActive: isDailyGame })

  // 3. Blockchain & Payment Logic
  const blockchain = useGameBlockchain(liveGame, {
    onGameUpdated: (updates) => setLiveGame((current) => ({ ...current, ...updates })),
  })
  const secretStatus = getSecretPanelStatus(liveGame)
  const hasSecretEpilogue = secretStatus.kind !== 'none'

  // 3. UI Local State
  const [showComicFinale, setShowComicFinale] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  /**
   * Helper: Generate visual storyboard preview
   */
  const generateStoryboardPreview = () => {
    if (session.messages.length === 0) return []
    return session.messages.filter(m => m.role === 'assistant').map((message, index) => ({
      title: `Panel ${index + 1}: ${liveGame.title} - Scene ${index + 1}`,
      description: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
      imagePrompt: message.imagePromptText || `A ${liveGame.genre} scene showing ${message.content.substring(0, 50)}...`,
      previewImage: message.narrativeImage || undefined
    }))
  }

  // Visual Themes
  const availableThemes = [
    { name: 'default', value: 'default', label: 'Default Theme', description: 'Standard comic book style' },
    { name: 'cyberpunk', value: 'cyberpunk', label: 'Cyberpunk', description: 'Neon lights and futuristic cityscapes' },
    { name: 'fantasy', value: 'fantasy', label: 'Fantasy', description: 'Magical realms and mythical creatures' },
    { name: 'noir', value: 'noir', label: 'Film Noir', description: 'Dark alleys and detective stories' },
    { name: 'watercolor', value: 'watercolor', label: 'Watercolor', description: 'Soft brush strokes and artistic feel' }
  ]

  const generateAIPromptSuggestions = (narrative: string): string[] => {
    const baseSuggestions = [
      `A ${liveGame.genre} style illustration of ${narrative.substring(0, 50)}...`,
      `Digital art of ${narrative.substring(0, 40)}..., ${liveGame.genre} theme, cinematic lighting`,
      `Comic book style illustration: ${narrative.substring(0, 45)}..., vibrant colors`,
    ]
    return baseSuggestions
  }

  const handleAIPromptSelect = (prompt: string) => {
    console.log('AI prompt selected:', prompt)
  }

  /**
   * Orchestration Handlers
   */
  const handleStartClick = () => {
    trackEvent('play_clicked', {
      surface: 'game_page_hero',
      gameSlug: liveGame.slug,
      mode: liveGame.mode || 'story',
    })
    setShowPreview(true)
  }

  const handlePreviewApproved = () => {
    setShowPreview(false)
    if (liveGame.playFee && parseFloat(liveGame.playFee) > 0) {
      setShowPaymentModal(true)
    } else {
      session.startGame()
    }
  }

  const onPaymentConfirm = () => {
    blockchain.handlePaymentConfirm(() => {
      setShowPaymentModal(false)
      session.startGame()
    })
  }

  const handleOptionClickWithDaily = useCallback(
    (optionId: number, optionText: string) => {
      session.handleOptionClick(optionId, optionText)

      if (isDailyGame) {
        const panelIndex = session.assistantMessageCount - 1
        const choiceIndex = optionId - 1
        if (panelIndex >= 0 && panelIndex < 5 && choiceIndex >= 0 && choiceIndex < 4) {
          dailyChallenge.recordChoice(panelIndex, choiceIndex).catch((err) => {
            console.error('[DailyChallenge] recordChoice failed:', err)
          })
        }
      }
    },
    [dailyChallenge, isDailyGame, session]
  )

  const previouslyIncompleteRef = useRef(true)
  const storyComplete = !!session.epilogueReflection || session.assistantMessageCount >= MAX_COMIC_PANELS

  useEffect(() => {
    if (!storyComplete || !previouslyIncompleteRef.current) return

    previouslyIncompleteRef.current = false

    const panelCount = session.assistantMessageCount

    trackEvent('story_completed', {
      gameSlug: liveGame.slug,
      panelCount,
      maxPanels: MAX_COMIC_PANELS,
      completionTimestamp: Date.now(),
      epilogueGenerated: !!session.epilogueReflection,
    })

    // Increment play count on the server
    fetch(`/api/games/${liveGame.slug}/play`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.sessionId }),
    }).catch(() => {
      // Non-critical — don't block the user if this fails
    })

    // Track in localStorage for the "Continue playing" homepage section
    trackPlay(liveGame.slug, liveGame.title)
  }, [storyComplete, liveGame.slug, liveGame.title, session.assistantMessageCount, session.epilogueReflection, session.sessionId, trackPlay])
  // During daily play the Hidden Hand lives in the desktop gameplay sidebar
  // (and as a slim teaser below on other screens) so it never pushes the
  // story off-screen. The full reveal card appears once the story completes.
  const hiddenHandInSidebar = isDailyGame && !storyComplete

  const renderEnrichment = (
    dailyDisplay: 'full' | 'teaser' | 'hidden' = 'full'
  ) => (
    <GameEnrichment
      gameId={liveGame.id}
      gameSlug={liveGame.slug}
      gameTitle={liveGame.title}
      primaryColor={liveGame.primaryColor || '#6366f1'}
      nftTokenId={liveGame.nftTokenId}
      secretPanelGenerated={liveGame.secretPanelGenerated}
      promptVaultUuid={liveGame.promptVaultUuid}
      hypercertUri={liveGame.hypercertUri}
      hypercertCid={liveGame.hypercertCid}
      storySessionId={session.sessionId}
      storyComplete={storyComplete}
      dailyDisplay={dailyDisplay}
      dailyPanelsDone={session.assistantMessageCount}
      articleUrl={liveGame.articleUrl}
    />
  )

  // NEW: Block gameplay if game not approved
  if (liveGame.approvalStatus === 'rejected' || liveGame.approvalStatus === 'pending') {
    return <GameStatusScreens game={liveGame} />
  }

  // COMIC FINALE SCREEN
  if (showComicFinale) {
    return (
      <>
        <ComicFinaleScreen
          game={liveGame}
          messages={session.messages}
          userChoices={session.userChoices}
          showComicFinale={showComicFinale}
          setShowComicFinale={setShowComicFinale}
          isMinting={blockchain.isMinting}
          handleMintComic={blockchain.handleMintComic}
          onArtifactSaved={(updates) => {
            setLiveGame((current) => ({ ...current, ...updates }))
          }}
          onStoryRegistrationComplete={(result) => {
            setLiveGame((current) => ({
              ...current,
              storyIpId: result.ipId,
              storyRegistrationTxHash: result.txHash,
              storyRegisteredAt: new Date(),
            }))
          }}
          handlePanelTextChange={(idx, text) => {
            const assistantMessages = session.messages.filter(m => m.role === 'assistant')
            if (assistantMessages[idx]) {
              session.handlePanelTextChange(assistantMessages[idx].id, text)
            }
          }}
          handlePanelImageChange={(idx, customPrompt) => {
            const assistantMessages = session.messages.filter(m => m.role === 'assistant')
            const message = assistantMessages[idx]
            if (message) {
              session.handleImageRegenerate(message.id, message.content, customPrompt)
            }
          }}
          regeneratingMessageId={session.regeneratingMessageId}
          extractedAssetIds={blockchain.extractedAssetIds}
          derivativeRegistered={blockchain.derivativeRegistered}
          chainId={blockchain.chainId}
          switchChain={blockchain.switchChain}
          isSwitchingChain={blockchain.isSwitchingChain}
          handleRegisterDerivativeIp={blockchain.handleRegisterDerivativeIp}
          isRegisteringDerivative={blockchain.isRegisteringDerivative}
          epilogueReflection={session.epilogueReflection}
          isOwner={isOwner}
        />
        {renderEnrichment('full')}
      </>
    )
  }

  // HERO SCREEN
  if (!session.isPlaying) {
    return (
      <>
        <HeroScreen
          game={liveGame}
          isStarting={session.isStarting}
          loadingProgress={session.loadingProgress}
          messages={session.messages}
          showPreview={showPreview}
          showPaymentModal={showPaymentModal}
          isPaying={blockchain.isPaying}
          playFee={liveGame.playFee || '0'}
          onStartClick={handleStartClick}
          onPreviewApproved={handlePreviewApproved}
          onPaymentConfirm={onPaymentConfirm}
          onClosePreview={() => setShowPreview(false)}
          onClosePayment={() => setShowPaymentModal(false)}
          startError={session.startError}
          onClearStartError={session.clearStartError}
          generateStoryboardPreview={generateStoryboardPreview}
        />
        {renderEnrichment(isDailyGame ? 'teaser' : 'full')}
      </>
    )
  }

  // GAMEPLAY SCREEN
  return (
    <>
      <GameplayScreen
        game={liveGame}
        messages={session.messages}
        isWaitingForResponse={session.isWaitingForResponse}
        pendingOptionId={session.pendingOptionId}
        assistantMessageCount={session.assistantMessageCount}
        canAddMorePanels={session.canAddMorePanels}
        isGeneratingEpilogue={session.isGeneratingEpilogue}
        epilogueReflection={session.epilogueReflection}
        epilogueGenerationFailed={session.epilogueGenerationFailed}
        userInput="" // No longer used
        onUserInputChange={() => { }}
        onOptionClick={(option) => {
          handleOptionClickWithDaily(option.id, option.text)
        }}
        onImagesReady={session.handleImagesReady}
        onImageRegenerate={session.handleImageRegenerate}
        onImageRating={session.handleImageRating}
        messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
        responseReady={session.responseReady}
        worldMood={session.worldMood}
        lastChoiceFeedback={session.lastChoiceFeedback}
        isRegenerating={session.regeneratingMessageId}
        setShowComicFinale={setShowComicFinale}
        availableThemes={availableThemes}
        generateAIPromptSuggestions={generateAIPromptSuggestions}
        handleAIPromptSelect={handleAIPromptSelect}
        isDailyActive={isDailyGame}
        dailyModifierHandles={dailyChallenge.state?.modifierHandles}
        dailyScoreHandle={dailyChallenge.state?.scoreHandle}
        hasSecretEpilogue={hasSecretEpilogue}
        hasMintedNft={Boolean(liveGame.nftTokenId)}
        sidebarExtra={
          hiddenHandInSidebar ? (
            <HiddenHandTeaser panelsDone={session.assistantMessageCount} />
          ) : undefined
        }
      />
      {/* Mobile has no sidebar — show the slim teaser below instead */}
      {hiddenHandInSidebar && (
        <div className="mx-auto max-w-2xl px-4 pb-6 lg:hidden">
          <HiddenHandTeaser panelsDone={session.assistantMessageCount} />
        </div>
      )}
      {renderEnrichment(hiddenHandInSidebar ? 'hidden' : 'full')}
    </>
  )
}
