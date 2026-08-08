import { useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { useVisualConfig } from '@/contexts/visual-config.context'
import { trackEvent } from '@/services/analytics'
import { MoodModifierService } from '../services/mood-modifier.service'
import { parsePanel } from '../utils/text-parser'
import { isNarrativeReady, canContinueAfterNarrative } from '../utils/playback-readiness'
import { ImageGenerationService, type ImageGenerationResult } from '../services/image-generation.service'
import { loadDailyChallengeState } from '@/lib/daily-challenge/daily-challenge-client'
import { config } from '@/lib/config'
import type { Game, ChatMessage, GameplayOption } from '../types'

export interface ChatEntry extends ChatMessage {
  options?: GameplayOption[]
  imageModel?: string
  imagePromptText?: string
  imageRating?: number
  narrativeImage?: string | null
  imageStatus?: 'pending' | 'ready' | 'failed'
  imageHistory?: Array<{ imageUrl: string | null; model: string; timestamp: number }>
}

export interface UserChoice {
  panelIndex: number
  choice: string
  timestamp: string
}

export interface ChoiceMoodDelta {
  tension: number
  chaos: number
  hope: number
}

export interface ChoiceFeedback {
  panelIndex: number
  delta: ChoiceMoodDelta
}

export interface GameSessionState {
  sessionId: string | null
  messages: ChatEntry[]
  isStarting: boolean
  isPlaying: boolean
  isWaitingForResponse: boolean
  loadingProgress: { text: boolean; images: boolean }
  responseReady: { text: boolean; images: boolean }
  pendingOptionId: number | null
  userChoices: UserChoice[]
  assistantMessageCount: number
  canAddMorePanels: boolean
  regeneratingMessageId: string | null
  // Epilogue
  isGeneratingEpilogue: boolean
  epilogueReflection: string | null
  epilogueGenerationFailed: boolean
  startError: string | null
  // Mood tracking
  worldMood: {
    tension: number
    chaos: number
    hope: number
  }
  lastChoiceFeedback: ChoiceFeedback | null
}

export interface GameSessionActions {
  startGame: () => Promise<void>
  sendMessage: (message: string, optionId?: number) => Promise<void>
  handleOptionClick: (optionId: number, optionText: string) => void
  handleImageGenerated: (messageId: string, result: ImageGenerationResult) => void
  handleImageRegenerate: (messageId: string, narrativeText: string, customPrompt?: string, theme?: string) => Promise<void>
  handleImagesReady: () => void
  handlePanelTextChange: (messageId: string, newText: string) => void
  handleImageRating: (messageId: string, rating: number) => void
  setMessages: React.Dispatch<React.SetStateAction<ChatEntry[]>>
  setIsPlaying: (value: boolean) => void
  clearStartError: () => void
}

const MAX_COMIC_PANELS = 5

function getChoiceMoodDelta(optionText: string): ChoiceMoodDelta {
  const lowerText = optionText.toLowerCase()

  return {
    tension: lowerText.includes('fight') || lowerText.includes('run') ? 2 : -1,
    chaos: lowerText.includes('unexpected') || lowerText.includes('surprise') ? 2 : -1,
    hope: lowerText.includes('help') || lowerText.includes('trust') ? 2 : -1,
  }
}

function getDailyChallengePayload(isDailyActive = false):
  | { dailyChallenge: { incoSessionId: string } }
  | Record<string, never> {
  if (!config.features.dailyChallenge || !isDailyActive) return {}
  const daily = loadDailyChallengeState()
  if (!daily?.incoSessionId) return {}
  return { dailyChallenge: { incoSessionId: daily.incoSessionId } }
}

export interface GameSessionOptions {
  embedded?: boolean
  ref?: string
  isDailyActive?: boolean
}

export function useGameSession(game: Game, options?: GameSessionOptions): GameSessionState & GameSessionActions {
  const { toast } = useToast()
  const { preferences } = useVisualConfig()

  // Core session state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [isStarting, setIsStarting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ text: false, images: false })
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const [responseReady, setResponseReady] = useState({ text: false, images: false })
  const [pendingOptionId, setPendingOptionId] = useState<number | null>(null)
  const [userChoices, setUserChoices] = useState<UserChoice[]>([])
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null)
  const [isGeneratingEpilogue, setIsGeneratingEpilogue] = useState(false)
  const [epilogueReflection, setEpilogueReflection] = useState<string | null>(null)
  const [epilogueGenerationFailed, setEpilogueGenerationFailed] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [worldMood, setWorldMood] = useState({ tension: 0, chaos: 0, hope: 0 })
  const [lastChoiceFeedback, setLastChoiceFeedback] = useState<ChoiceFeedback | null>(null)
  const decisionStartedAtRef = useRef<number | null>(null)

  // Derived state
  const assistantMessageCount = messages.filter(m => m.role === 'assistant').length
  const canAddMorePanels = assistantMessageCount < MAX_COMIC_PANELS
  const _storyComplete = !canAddMorePanels || !!epilogueReflection

  /**
   * Handle image generation result - updates the message with the generated image
   */
  const handleImageGenerated = useCallback((messageId: string, result: ImageGenerationResult) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          narrativeImage: result.imageUrl,
          imageStatus: result.imageUrl ? 'ready' : 'failed',
          imageModel: result.model,
          imageHistory: [...(msg.imageHistory || []), result]
        }
      }
      return msg
    }))
  }, [])

  /**
   * Handle when images are ready from ComicPanelCard
   */
  const handleImagesReady = useCallback(() => {
    setLoadingProgress(prev => ({ ...prev, images: true }))
    setResponseReady(prev => ({ ...prev, images: true }))
  }, [])

  /**
   * Handle panel text editing
   */
  const handlePanelTextChange = useCallback((messageId: string, newText: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, content: newText } : msg
    ))
  }, [])

  /**
   * Handle image rating
   */
  const handleImageRating = useCallback((messageId: string, rating: number) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        if (msg.imageModel) {
          ImageGenerationService.recordModelFeedback(msg.imageModel, rating)
        }
        return { ...msg, imageRating: rating }
      }
      return msg
    }))
  }, [])

  /**
   * Start game - creates session and generates initial narrative
   */
  const startGame = useCallback(async () => {
    setIsStarting(true)
    setStartError(null)
    setLoadingProgress({ text: false, images: false })

    try {
      // Step 1: Create session
      const sessionResponse = await fetch('/api/session/new')
      const sessionData = await sessionResponse.json()

      if (!sessionData.success) {
        throw new Error('Failed to create session')
      }

      const newSessionId = sessionData.data.sessionId
      setSessionId(newSessionId)

      // Step 2: Generate initial narrative content
      const startResponse = await fetch(`/api/games/${game.slug}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId,
          ...(options?.embedded ? { embedded: true } : {}),
          ...(options?.ref ? { ref: options.ref } : {}),
          ...getDailyChallengePayload(options?.isDailyActive),
        }),
      })

      if (!startResponse.ok) {
        throw new Error('Failed to start game')
      }

      const reader = startResponse.body?.getReader()
      if (!reader) throw new Error('No response body')

      let currentMessage = ''
      let currentOptions: GameplayOption[] = []

      // Process the streaming response
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'error') {
                console.error('Game start error from server:', data.error)
                const message = data.error || 'AI generation failed. Please try again.'
                toast({
                  title: "Failed to start game",
                  description: message,
                  variant: "destructive"
                })
                setStartError(message)
                setIsStarting(false)
                return
              } else if (data.type === 'content') {
                currentMessage += data.content
              } else if (data.type === 'options') {
                currentOptions = data.options || []
              } else if (data.type === 'end') {
                setLoadingProgress(prev => ({ ...prev, text: true }))

                // Create the message for image generation
                const content = currentMessage
                const optionStartRegex = /[\n\r]+\s*1[.)]\s+/
                const match = content.match(optionStartRegex)

                const cleanContent = match && match.index && currentOptions.length > 0
                  ? content.substring(0, match.index).trim()
                  : content

                const finalMessage: ChatEntry = {
                  id: `initial-${newSessionId}`,
                  sessionId: newSessionId,
                  gameId: game.id,
                  role: 'assistant',
                  content: cleanContent,
                  options: currentOptions,
                  model: game.promptModel,
                  createdAt: new Date(),
                  imageStatus: 'pending',
                }

                setMessages([finalMessage])

                // Generate initial image
                const { narrative: firstNarrative } = parsePanel(cleanContent)

                ImageGenerationService.generateImage({
                  prompt: firstNarrative,
                  genre: game.genre,
                  style: 'comic_book',
                  aspectRatio: 'landscape',
                  preferredModel: preferences?.preferredModel // Pass preference
                }).then((result) => {                  handleImageGenerated(finalMessage.id, result)
                  setLoadingProgress(prev => ({ ...prev, images: true }))
                }).catch(err => {
                  console.error('Hero screen image preload error:', err)
                  handleImageGenerated(finalMessage.id, { imageUrl: null, model: 'failed', provider: 'failed', timestamp: Date.now() })
                  setLoadingProgress(prev => ({ ...prev, images: true }))
                })
              }
            } catch (error) {
              console.error('Error parsing stream data:', error)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to start game:', error)
      setStartError('Could not start this story. Try again or pick another game in the arcade.')
      setIsStarting(false)
    }
  }, [game, toast, handleImageGenerated, options?.embedded, options?.ref, options?.isDailyActive, preferences?.preferredModel])

  /**
   * Generate epilogue + reflection after game completes
   */
  const isGeneratingEpilogueRef = useRef(false)

   
  const generateEpilogue = useCallback(async () => {
    if (!sessionId || isGeneratingEpilogueRef.current) return
    isGeneratingEpilogueRef.current = true

    trackEvent('epilogue_opened', {
      gameSlug: game.slug,
      panelCount: assistantMessageCount,
    })

    setEpilogueReflection(null)
    setIsGeneratingEpilogue(true)

    try {
      const response = await fetch('/api/games/epilogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          articleContext: game.articleContext,
          genre: game.genre,
          gameTitle: game.title,
          choices: userChoices.map(c => c.choice),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate epilogue')
      }

      const result = await response.json()
      const { epilogue, reflection } = result.data

      setEpilogueReflection(reflection)

      ImageGenerationService.generateImage({
        prompt: epilogue,
        genre: game.genre,
        style: 'comic_book',
        aspectRatio: 'landscape',
        preferredModel: preferences?.preferredModel,
      }).then((imageResult) => {
        const epilogueMessage: ChatEntry = {
          id: `epilogue-${sessionId}`,
          sessionId,
          gameId: game.id,
          role: 'assistant',
          content: epilogue,
          narrativeImage: imageResult.imageUrl,
          imageStatus: imageResult.imageUrl ? 'ready' : 'failed',
          imageModel: imageResult.model,
          model: game.promptModel,
          createdAt: new Date(),
        }

        setMessages(prev => [...prev, epilogueMessage])
        setIsGeneratingEpilogue(false)
        isGeneratingEpilogueRef.current = false
        trackEvent('epilogue_completed', {
          gameSlug: game.slug,
          panelCount: assistantMessageCount,
        })
      }).catch(err => {
        console.error('Epilogue image generation error:', err)
        const epilogueMessage: ChatEntry = {
          id: `epilogue-${sessionId}`,
          sessionId,
          gameId: game.id,
          role: 'assistant',
          content: epilogue,
          imageStatus: 'failed',
          model: game.promptModel,
          createdAt: new Date(),
        }
        setMessages(prev => [...prev, epilogueMessage])
        setIsGeneratingEpilogue(false)
        isGeneratingEpilogueRef.current = false
        trackEvent('epilogue_completed', {
          gameSlug: game.slug,
          panelCount: assistantMessageCount,
        })
      })
    } catch (error) {
      console.error('Epilogue generation failed:', error)
      setIsGeneratingEpilogue(false)
      isGeneratingEpilogueRef.current = false
      setEpilogueGenerationFailed(true)
      trackEvent('epilogue_failed', {
        gameSlug: game.slug,
        panelCount: assistantMessageCount,
      })
    }
  }, [sessionId, game, userChoices, preferences, assistantMessageCount])

  /**
   * Send message - continues the game conversation
   */
   
  const sendMessage = useCallback(async (message: string, optionId?: number) => {
    if (!sessionId || !message.trim()) return

    setIsWaitingForResponse(true)
    setResponseReady({ text: false, images: false })

    const userMessage: ChatEntry = {
      id: `user-${Date.now()}`,
      sessionId,
      gameId: game.id,
      role: 'user',
      content: message.trim(),
      model: game.promptModel,
      createdAt: new Date(),
    }

    setMessages(prev => [...prev, userMessage])

    try {
      const response = await fetch(`/api/games/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          gameId: game.id,
          message: message.trim(),
          ...(optionId ? { optionId } : {}),
          ...getDailyChallengePayload(options?.isDailyActive),
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        if (body.gameComplete) {
          setMessages(prev => prev.filter(m => m.id !== userMessage.id))
          setIsWaitingForResponse(false)
          setPendingOptionId(null)
          setIsGeneratingEpilogue(true)
          generateEpilogue()
          return
        }
        throw new Error(body.error || 'Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let currentMessage = ''
      let currentOptions: GameplayOption[] = []
      // Keep the panel identity stable across streamed chunks and async image
      // generation. React state updaters are not a safe place to capture IDs.
      const assistantMessageId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'content') {
                currentMessage += data.content
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]

                  if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.options) {
                    lastMessage.content = currentMessage
                  } else {
                    newMessages.push({
                      id: assistantMessageId,
                      sessionId,
                      gameId: game.id,
                      role: 'assistant',
                      content: currentMessage,
                      model: game.promptModel,
                      createdAt: new Date(),
                      imageStatus: 'pending',
                    })
                  }

                  return newMessages
                })
              } else if (data.type === 'options') {
                currentOptions = data.options || []
              } else if (data.type === 'end') {
                const messageId = assistantMessageId
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]
                  if (lastMessage) {
                    lastMessage.options = currentOptions
                    lastMessage.imageStatus = 'pending'

                    const content = lastMessage.content
                    const optionStartRegex = /[\n\r]+\s*1[.)]\s+/
                    const match = content.match(optionStartRegex)
                    if (match && match.index && currentOptions.length > 0) {
                      lastMessage.content = content.substring(0, match.index).trim()
                    }
                  }
                  return newMessages
                })

                setResponseReady(prev => ({ ...prev, text: true }))

                trackEvent('panel_completed', {
                  gameSlug: game.slug,
                  panelIndex: assistantMessageCount + 1,
                  totalPanels: MAX_COMIC_PANELS,
                })

                // Generate image for this panel
                const { narrative } = parsePanel(currentMessage)
                const startTime = Date.now()
                const moodModifiers = MoodModifierService.getMoodModifiers(worldMood, game.genre)
                const finalPrompt = moodModifiers ? `${narrative}, ${moodModifiers}` : narrative

                ImageGenerationService.generateImage({
                  prompt: finalPrompt,
                  genre: game.genre,
                  style: 'comic_book',
                  aspectRatio: 'landscape',
                  preferredModel: preferences?.preferredModel
                }).then((result) => {
                  if (messageId) {
                    handleImageGenerated(messageId, result)
                    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
                    // Show performance toast
                    toast({
                      title: '🎨 Visual Ready',
                      description: `Generated using ${result.model} in ~${duration}s`,
                    })
                  }
                  setResponseReady(prev => ({ ...prev, images: true }))
                }).catch(err => {
                  console.error('Image generation error:', err)
                  if (messageId) {
                    handleImageGenerated(messageId, { imageUrl: null, model: 'failed', provider: 'failed', timestamp: Date.now() })
                  }
                  setResponseReady(prev => ({ ...prev, images: true }))
                })
              } else if (data.type === 'game_complete') {
                // Game finished - handled by parent component
              }
            } catch (error) {
              console.error('Error parsing stream data:', error)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)

      // Check if this is a game completion error (expected behavior)
      if (error instanceof Error && (
        error.message?.includes('complete') ||
        error.message?.includes('maximum panels') ||
        error.message?.includes('400')
      )) {
        console.log('Game completed - generating epilogue')
        setMessages(prev => prev.filter(m => m.id !== userMessage.id))
        setIsGeneratingEpilogue(true)
        generateEpilogue()
      }
    } finally {
      setIsWaitingForResponse(false)
      setPendingOptionId(null)
    }
  }, [sessionId, game, handleImageGenerated, generateEpilogue, options?.isDailyActive, assistantMessageCount, preferences?.preferredModel, toast, worldMood])

  /**
   * Handle option click - triggers sendMessage with the option text.
   *
   * Choices change the visual/story signal, but never consume time, credits,
   * retries, or any other player resource.
   */
  const handleOptionClick = useCallback((optionId: number, optionText: string) => {
    const decisionLatencyMs = decisionStartedAtRef.current === null
      ? null
      : Math.max(0, Date.now() - decisionStartedAtRef.current)
    decisionStartedAtRef.current = null

    if (!canAddMorePanels) {
      setPendingOptionId(null)
      return
    }

    setPendingOptionId(optionId)
    setUserChoices(prev => [...prev, {
      panelIndex: assistantMessageCount,
      choice: optionText,
      timestamp: new Date().toISOString()
    }])

    const delta = getChoiceMoodDelta(optionText)
    setLastChoiceFeedback({ panelIndex: assistantMessageCount, delta })
    setWorldMood(prev => ({
      tension: prev.tension + delta.tension,
      chaos: prev.chaos + delta.chaos,
      hope: prev.hope + delta.hope,
    }))

    trackEvent('choice_made', {
      gameSlug: game.slug,
      panelIndex: assistantMessageCount,
      choiceIndex: optionId - 1,
      decisionLatencyMs,
      dailyChallenge: options?.isDailyActive === true,
    })

    sendMessage(optionText, optionId)
  }, [assistantMessageCount, canAddMorePanels, game.slug, options?.isDailyActive, sendMessage])

  /**
   * Regenerate image for a specific panel
   */
   
  const handleImageRegenerate = useCallback(async (messageId: string, narrativeText: string, customPrompt?: string, theme?: string) => {
    setRegeneratingMessageId(messageId)

    try {
      const promptToUse = customPrompt || narrativeText

      const result = await ImageGenerationService.generateImage({
        prompt: promptToUse,
        genre: game.genre,
        style: 'comic_book',
        aspectRatio: 'landscape',
        force: true,
        preferredModel: preferences?.preferredModel,
        theme
      })
      handleImageGenerated(messageId, result)

      toast({
        title: '✨ Image regenerated',
        description: customPrompt ? 'New image created with your custom prompt' : 'New image generated successfully',
      })
    } catch (error) {
      console.error('Image regeneration failed:', error)
      toast({
        title: "Image regeneration failed",
        description: "Please try again",
        variant: "destructive"
      })
    } finally {
      setRegeneratingMessageId(null)
    }
  }, [game, handleImageGenerated, toast, preferences?.preferredModel])

  // Start measuring when a panel is ready. This is instrumentation only:
  // decision time is never used as a score or penalty.
  useEffect(() => {
    if (assistantMessageCount > 0 && canAddMorePanels && !isWaitingForResponse && pendingOptionId === null) {
      decisionStartedAtRef.current = Date.now()
    }
  }, [assistantMessageCount, canAddMorePanels, isWaitingForResponse, pendingOptionId])

  // Narrative is the playable unit. Let the player start reading and choosing
  // while the first visual continues generating in the panel background.
  useEffect(() => {
    if (isNarrativeReady(loadingProgress)) {
      setIsPlaying(true)
      setIsStarting(false)
    }
  }, [loadingProgress])

  // Text unlocks the next choice. Image readiness is intentionally tracked
  // separately so a slow visual can never block the story or a later choice.
  useEffect(() => {
    if (isWaitingForResponse && canContinueAfterNarrative(responseReady)) {
      setIsWaitingForResponse(false)
      setPendingOptionId(null)
    }
  }, [responseReady, isWaitingForResponse])

  return {
    // State
    sessionId,
    messages,
    isStarting,
    isPlaying,
    isWaitingForResponse,
    loadingProgress,
    responseReady,
    worldMood,
    lastChoiceFeedback,
    pendingOptionId,
    userChoices,
    assistantMessageCount,
    canAddMorePanels,
    regeneratingMessageId,
    isGeneratingEpilogue,
    epilogueReflection,
    epilogueGenerationFailed,
    startError,
    // Actions
    startGame,
    sendMessage,
    handleOptionClick,
    handleImageGenerated,
    handleImageRegenerate,
    handleImagesReady,
    handlePanelTextChange,
    handleImageRating,
    setMessages,
    setIsPlaying,
    clearStartError: () => setStartError(null),
  }
}
