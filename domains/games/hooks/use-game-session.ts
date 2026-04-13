import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { useVisualConfig } from '@/contexts/visual-config.context'
import { MoodModifierService } from '../services/mood-modifier.service'
import { parsePanel } from '../utils/text-parser'
import { ImageGenerationService, type ImageGenerationResult } from '../services/image-generation.service'
import type { Game, ChatMessage, GameplayOption } from '../types'

export interface ChatEntry extends ChatMessage {
  options?: GameplayOption[]
  imageModel?: string
  imagePromptText?: string
  imageRating?: number
  narrativeImage?: string | null
  imageHistory?: Array<{ imageUrl: string | null; model: string; timestamp: number }>
}

export interface UserChoice {
  panelIndex: number
  choice: string
  timestamp: string
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
  // Mood tracking
  worldMood: {
    tension: number
    chaos: number
    hope: number
  }
}

export interface GameSessionActions {
  startGame: () => Promise<void>
  sendMessage: (message: string) => Promise<void>
  handleOptionClick: (optionId: number, optionText: string) => void
  handleImageGenerated: (messageId: string, result: ImageGenerationResult) => void
  handleImageRegenerate: (messageId: string, narrativeText: string, customPrompt?: string) => Promise<void>
  handleImagesReady: () => void
  handlePanelTextChange: (messageId: string, newText: string) => void
  handleImageRating: (messageId: string, rating: number) => void
  setMessages: React.Dispatch<React.SetStateAction<ChatEntry[]>>
  setIsPlaying: (value: boolean) => void
}

const MAX_COMIC_PANELS = 5

export function useGameSession(game: Game): GameSessionState & GameSessionActions {
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
  const [worldMood, setWorldMood] = useState({ tension: 0, chaos: 0, hope: 0 })

  // Derived state
  const assistantMessageCount = messages.filter(m => m.role === 'assistant').length
  const canAddMorePanels = assistantMessageCount < MAX_COMIC_PANELS

  /**
   * Handle image generation result - updates the message with the generated image
   */
  const handleImageGenerated = useCallback((messageId: string, result: ImageGenerationResult) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          narrativeImage: result.imageUrl,
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
        body: JSON.stringify({ sessionId: newSessionId }),
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
                toast({
                  title: "Failed to start game",
                  description: data.error || "AI generation failed. Please try again.",
                  variant: "destructive"
                })
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
      setIsStarting(false)
    }
  }, [game, toast, handleImageGenerated])

  /**
   * Send message - continues the game conversation
   */
  const sendMessage = useCallback(async (message: string) => {
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
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let currentMessage = ''
      let currentOptions: GameplayOption[] = []

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
                      id: `assistant-${Date.now()}`,
                      sessionId,
                      gameId: game.id,
                      role: 'assistant',
                      content: currentMessage,
                      model: game.promptModel,
                      createdAt: new Date(),
                    })
                  }

                  return newMessages
                })
              } else if (data.type === 'options') {
                currentOptions = data.options || []
              } else if (data.type === 'end') {
                let messageId = ''
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]
                  if (lastMessage) {
                    messageId = lastMessage.id
                    lastMessage.options = currentOptions

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
        console.log('Game completed - this is expected behavior')
        setMessages(prev => prev.filter(m => m.id !== userMessage.id))
      }
    } finally {
      setIsWaitingForResponse(false)
      setPendingOptionId(null)
    }
  }, [sessionId, game, handleImageGenerated])

  /**
   * Handle option click - triggers sendMessage with the option text
   */
  const handleOptionClick = useCallback((optionId: number, optionText: string) => {
    setPendingOptionId(optionId)
    setUserChoices(prev => [...prev, {
      panelIndex: assistantMessageCount,
      choice: optionText,
      timestamp: new Date().toISOString()
    }])

    // Mood shift logic (example)
    const lowerText = optionText.toLowerCase()
    setWorldMood(prev => ({
      tension: prev.tension + (lowerText.includes('fight') || lowerText.includes('run') ? 2 : -1),
      chaos: prev.chaos + (lowerText.includes('unexpected') || lowerText.includes('surprise') ? 2 : -1),
      hope: prev.hope + (lowerText.includes('help') || lowerText.includes('trust') ? 2 : -1)
    }))

    sendMessage(optionText)
  }, [assistantMessageCount, sendMessage])

  /**
   * Regenerate image for a specific panel
   */
  const handleImageRegenerate = useCallback(async (messageId: string, narrativeText: string, customPrompt?: string) => {
    setRegeneratingMessageId(messageId)

    try {
      const promptToUse = customPrompt || narrativeText

      const result = await ImageGenerationService.generateImage({
        prompt: promptToUse,
        genre: game.genre,
        style: 'comic_book',
        aspectRatio: 'landscape',
        force: true,
        preferredModel: preferences?.preferredModel
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
  }, [game, handleImageGenerated, toast])

  // Transition to game screen when initial content is ready
  useEffect(() => {
    if (loadingProgress.text && loadingProgress.images) {
      setIsPlaying(true)
      setIsStarting(false)
    }
  }, [loadingProgress.text, loadingProgress.images])

  // Stop waiting when both text AND images are ready
  useEffect(() => {
    if (isWaitingForResponse && responseReady.text && responseReady.images) {
      setIsWaitingForResponse(false)
      setPendingOptionId(null)
    }
  }, [responseReady.text, responseReady.images, isWaitingForResponse])

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
    pendingOptionId,
    userChoices,
    assistantMessageCount,
    canAddMorePanels,
    regeneratingMessageId,
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
  }
}
