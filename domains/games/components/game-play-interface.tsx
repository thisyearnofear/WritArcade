'use client'

import { useState, useRef } from 'react'
import { useAccount } from 'wagmi'

import { Game } from '../types'
import { useGameSession } from '../hooks/use-game-session'
import { useGameBlockchain } from '../hooks/use-game-blockchain'
import { trackEvent } from '@/lib/analytics'

// Screen Components
import { HeroScreen } from './screens/hero-screen'
import { GameplayScreen } from './screens/gameplay-screen'
import { ComicFinaleScreen } from './screens/comic-finale-screen'
import { GameStatusScreens } from './screens/game-status-screens'
import { GameEnrichment } from './game-enrichment'

interface GamePlayInterfaceProps {
  game: Game
}

const MAX_COMIC_PANELS = 5

export function GamePlayInterface({ game }: GamePlayInterfaceProps) {
  // Account hook kept for potential future features
  useAccount()

  // 1. Session & Gameplay Logic
  const session = useGameSession(game)

  // 2. Blockchain & Payment Logic
  const blockchain = useGameBlockchain(game)

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
      title: `Panel ${index + 1}: ${game.title} - Scene ${index + 1}`,
      description: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
      imagePrompt: message.imagePromptText || `A ${game.genre} scene showing ${message.content.substring(0, 50)}...`,
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
      `A ${game.genre} style illustration of ${narrative.substring(0, 50)}...`,
      `Digital art of ${narrative.substring(0, 40)}..., ${game.genre} theme, cinematic lighting`,
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
      gameSlug: game.slug,
      mode: game.mode || 'story',
    })
    setShowPreview(true)
  }

  const handlePreviewApproved = () => {
    setShowPreview(false)
    if (game.playFee && parseFloat(game.playFee) > 0) {
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

  const previouslyIncompleteRef = useRef(true)
  const storyComplete = !!session.epilogueReflection || session.assistantMessageCount >= MAX_COMIC_PANELS
  if (storyComplete && previouslyIncompleteRef.current) {
    previouslyIncompleteRef.current = false

    const panelCount = session.assistantMessageCount
    const completionTimestamp = Date.now()

    trackEvent('story_completed', {
      gameSlug: game.slug,
      panelCount,
      maxPanels: MAX_COMIC_PANELS,
      completionTimestamp,
      epilogueGenerated: !!session.epilogueReflection,
    })
  }
  const renderEnrichment = () => (
    <GameEnrichment
      gameId={game.id}
      gameSlug={game.slug}
      primaryColor={game.primaryColor || '#6366f1'}
      nftTokenId={game.nftTokenId}
      secretPanelGenerated={game.secretPanelGenerated}
      promptVaultUuid={game.promptVaultUuid}
      hypercertUri={game.hypercertUri}
      hypercertCid={game.hypercertCid}
      storySessionId={session.sessionId}
      storyComplete={storyComplete}
    />
  )

  // NEW: Block gameplay if game not approved
  if (game.approvalStatus === 'rejected' || game.approvalStatus === 'pending') {
    return <GameStatusScreens game={game} />
  }

  // COMIC FINALE SCREEN
  if (showComicFinale) {
    return (
      <>
        <ComicFinaleScreen
          game={game}
          messages={session.messages}
          userChoices={session.userChoices}
          showComicFinale={showComicFinale}
          setShowComicFinale={setShowComicFinale}
          isMinting={blockchain.isMinting}
          handleMintComic={blockchain.handleMintComic}
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
          maxPanels={MAX_COMIC_PANELS}
          epilogueReflection={session.epilogueReflection}
        />
        {renderEnrichment()}
      </>
    )
  }

  // HERO SCREEN
  if (!session.isPlaying) {
    return (
      <>
        <HeroScreen
          game={game}
          isStarting={session.isStarting}
          loadingProgress={session.loadingProgress}
          messages={session.messages}
          showPreview={showPreview}
          showPaymentModal={showPaymentModal}
          isPaying={blockchain.isPaying}
          playFee={game.playFee || '0'}
          onStartClick={handleStartClick}
          onPreviewApproved={handlePreviewApproved}
          onPaymentConfirm={onPaymentConfirm}
          onClosePreview={() => setShowPreview(false)}
          onClosePayment={() => setShowPaymentModal(false)}
          generateStoryboardPreview={generateStoryboardPreview}
        />
        {renderEnrichment()}
      </>
    )
  }

  // GAMEPLAY SCREEN
  return (
    <>
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
        userInput="" // No longer used
        onUserInputChange={() => { }}
        onOptionClick={(option) => {
          session.handleOptionClick(option.id, option.text)
        }}
        onImagesReady={session.handleImagesReady}
        onImageRegenerate={session.handleImageRegenerate}
        onImageRating={session.handleImageRating}
        messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
        responseReady={session.responseReady}
        worldMood={session.worldMood}
        isRegenerating={session.regeneratingMessageId}
        setShowComicFinale={setShowComicFinale}
        availableThemes={availableThemes}
        generateAIPromptSuggestions={generateAIPromptSuggestions}
        handleAIPromptSelect={handleAIPromptSelect}
      />
      {renderEnrichment()}
    </>
  )
}
