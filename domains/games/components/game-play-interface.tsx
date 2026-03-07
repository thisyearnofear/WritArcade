'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAccount, useWriteContract, useWalletClient, useChainId, useSwitchChain } from 'wagmi'
import { parseEther } from 'viem'

import { Loader2, Play, BookOpen, Lightbulb, ArrowRightLeft } from 'lucide-react'
import { createStoryClientFromWallet, STORY_CHAIN_ID, STORY_SPG_CONTRACT, isOnStoryNetwork } from '@/lib/story-sdk-client'
import { Game, ChatMessage, GameplayOption } from '../types'
import { getWriterCoinById } from '@/lib/writerCoins'
import { type GameCreator, type GameAuthor } from '@/lib/services/ipfs-metadata.service'
import { ImageGenerationService, type ImageGenerationResult } from '../services/image-generation.service'
import { ComicPanelCard } from './comic-panel-card'
import { ComicBookFinale, type ComicBookFinalePanelData } from './comic-book-finale'
import { parsePanel } from '../utils/text-parser'
import { useToast } from '@/components/ui/use-toast'
import { NarrativePreviewModal } from '@/components/game/narrative-preview-modal'

// Mock ABI for V2 functionality - replaced by real import in production
const WRITER_COIN_PAYMENT_ABI = [
  {
    "type": "function",
    "name": "payForGameplay",
    "inputs": [
      { "name": "writerCoin", "type": "address" },
      { "name": "gameCreator", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable"
  }
]

// WriterCoinPayment V2 Address (Needs update after redeployment)
const PAYMENT_CONTRACT_ADDRESS = "0xa794b662E103790E44100E4A3240370a5C704209"

interface GamePlayInterfaceProps {
  game: Game
}

interface ChatEntry extends ChatMessage {
  options?: GameplayOption[]
  imageModel?: string             // Which Venice AI model generated this image
  imagePromptText?: string        // The prompt used to generate this image
  imageRating?: number            // User rating (1-5) for this image
  narrativeImage?: string | null  // Comic panel image URL (current selected)
  imageHistory?: Array<{ url: string | null; model: string; timestamp: number }> // All generated versions
}

const MAX_COMIC_PANELS = 5

export function GamePlayInterface({ game }: GamePlayInterfaceProps) {
  const { toast } = useToast()
  // useAccount hook kept for future gameplay payment features (v2 contract)
  useAccount()
  const { writeContractAsync } = useWriteContract()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [isStarting, setIsStarting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ text: false, images: false })
  const [userInput, setUserInput] = useState('')
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const [showComicFinale, setShowComicFinale] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [pendingOptionId, setPendingOptionId] = useState<number | null>(null) // Track which option is loading
  const [responseReady, setResponseReady] = useState({ text: false, images: false }) // Track when response is FULLY ready
  const [userChoices, setUserChoices] = useState<Array<{ panelIndex: number; choice: string; timestamp: string }>>([])
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null) // Track which panel is regenerating
  const [showPreview, setShowPreview] = useState(false) // NEW: Preview modal state
  const [editedPanels, _setEditedPanels] = useState<Record<string, string>>({}) // Track edited panel text
  const [extractedAssetIds, setExtractedAssetIds] = useState<string[]>([]) // Asset IDs returned after mint confirm
  const [isRegisteringDerivative, setIsRegisteringDerivative] = useState(false)
  const [derivativeRegistered, setDerivativeRegistered] = useState(false)
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const assistantMessageCount = messages.filter(m => m.role === 'assistant').length
  const canAddMorePanels = assistantMessageCount < MAX_COMIC_PANELS

  /**
   * Generate visual storyboard preview - Enhanced Feature
   * Creates preview data for all panels based on existing messages
   */
  const generateStoryboardPreview = (): Array<{
    title: string
    description: string
    imagePrompt: string
    previewImage?: string
  }> => {
    if (messages.length === 0) return []
    
    // Generate preview for each existing panel
    return messages.filter(m => m.role === 'assistant').map((message, index) => ({
      title: `Panel ${index + 1}: ${game.title} - Scene ${index + 1}`,
      description: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
      imagePrompt: message.imagePromptText || `A ${game.genre} scene showing ${message.content.substring(0, 50)}...`,
      previewImage: message.narrativeImage || undefined
    }))
  }

  /**
   * Available visual themes - Enhanced Feature
   * Theme selection for comic panels
   */
  const availableThemes = [
    {
      name: 'default',
      value: 'default',
      label: 'Default Theme',
      description: 'Standard comic book style'
    },
    {
      name: 'cyberpunk',
      value: 'cyberpunk',
      label: 'Cyberpunk',
      description: 'Neon lights and futuristic cityscapes'
    },
    {
      name: 'fantasy',
      value: 'fantasy',
      label: 'Fantasy',
      description: 'Magical realms and mythical creatures'
    },
    {
      name: 'noir',
      value: 'noir',
      label: 'Film Noir',
      description: 'Dark alleys and detective stories'
    },
    {
      name: 'watercolor',
      value: 'watercolor',
      label: 'Watercolor',
      description: 'Soft brush strokes and artistic feel'
    }
  ]

  /**
   * Handle theme selection - Enhanced Feature
   * Updates the theme for comic panels
   */
  const handleThemeSelect = (theme: string) => {
    // In a real implementation, this would update the game state or preferences
    console.log('Theme selected:', theme)
    // Could be enhanced to update game metadata or user preferences
  }

  /**
   * Generate AI prompt suggestions - Enhanced Feature
   * Creates AI-assisted prompt suggestions based on narrative content
   */
  const generateAIPromptSuggestions = (narrative: string): string[] => {
    // In a real implementation, this would call an AI service
    // For now, we'll generate some reasonable suggestions based on the content
    
    const baseSuggestions = [
      `A ${game.genre} style illustration of ${narrative.substring(0, 50)}...`,
      `Digital art of ${narrative.substring(0, 40)}..., ${game.genre} theme, cinematic lighting`,
      `Fantasy scene featuring ${narrative.substring(0, 30)}..., detailed, 8k resolution`,
      `Comic book style illustration: ${narrative.substring(0, 45)}..., vibrant colors`,
      `Dark and moody ${game.genre} artwork showing ${narrative.substring(0, 35)}...`
    ]
    
    // Add some genre-specific suggestions
    if (game.genre.toLowerCase().includes('horror')) {
      baseSuggestions.push(
        `Horror-themed illustration of ${narrative.substring(0, 40)}..., eerie atmosphere, dark colors`,
        `Spooky scene featuring ${narrative.substring(0, 30)}..., Halloween vibe, creepy details`
      )
    } else if (game.genre.toLowerCase().includes('comedy')) {
      baseSuggestions.push(
        `Funny cartoon illustration of ${narrative.substring(0, 40)}..., exaggerated expressions, bright colors`,
        `Comical scene showing ${narrative.substring(0, 30)}..., humorous details, playful style`
      )
    } else if (game.genre.toLowerCase().includes('fantasy')) {
      baseSuggestions.push(
        `Epic fantasy artwork of ${narrative.substring(0, 40)}..., magical elements, grand scale`,
        `Mythical scene featuring ${narrative.substring(0, 30)}..., dragons, castles, enchanted forest`
      )
    }
    
    return baseSuggestions
  }

  /**
   * Handle AI prompt selection - Enhanced Feature
   * Updates the custom prompt when user selects an AI suggestion
   */
  const handleAIPromptSelect = (prompt: string) => {
    console.log('AI prompt selected:', prompt)
    // In a real implementation, this would update the regeneration prompt
  }

  // Auto-scroll to new content when messages update and user isn't actively scrolling up
  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [messages])

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  const handleStartClick = () => {
    // NEW: Show preview modal first (before payment/gameplay)
    // Enhanced with brand theme and animations
    setShowPreview(true)
  }

  const handlePreviewApproved = () => {
    setShowPreview(false)
    // Then show payment if needed, or start directly
    if (game.playFee && parseFloat(game.playFee) > 0) {
      setShowPaymentModal(true)
    } else {
      startGame()
    }
  }

  const handlePaymentConfirm = async () => {
    setIsPaying(true)
    try {
      if (!game.playFee) return

      const gameCreator = game.creatorWallet || "0x0000000000000000000000000000000000000000" // Fallback if no creator wallet (should technically fail/msg user)

      // Call payForGameplay on the V2 contract
      const tx = await writeContractAsync({
        address: PAYMENT_CONTRACT_ADDRESS as `0x${string}`,
        abi: WRITER_COIN_PAYMENT_ABI,
        functionName: 'payForGameplay',
        args: [
          (getWriterCoinById(game.writerCoinId ?? 'avc')?.address ?? getWriterCoinById('avc')!.address) as `0x${string}`,
          gameCreator,           // The independent creator of this specific game
          parseEther(game.playFee) // The amount
        ]
      })

      console.log('Payment sent:', tx)
      toast({
        title: "Payment Successful!",
        description: "Insert coin accepted. Game starting...",
      })

      setShowPaymentModal(false)
      startGame()
    } catch (error) {
      console.error('Payment failed', error)
      toast({
        title: "Payment Failed",
        description: "Please ensure you have enough tokens and try again.",
        variant: "destructive"
      })
    } finally {
      setIsPaying(false)
    }
  }

  const startGame = async () => {
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

      // Process the streaming response but don't switch screens yet
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
                // Don't update UI yet - keep user on hero screen
              } else if (data.type === 'options') {
                currentOptions = data.options || []
              } else if (data.type === 'end') {
                // Text generation complete
                setLoadingProgress(prev => ({ ...prev, text: true }))

                // Now create the message for image generation
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

                // Generate initial image while on hero screen
                setLoadingProgress(prev => ({ ...prev, text: true }))

                const { narrative: firstNarrative } = parsePanel(cleanContent)

                ImageGenerationService.generateImage({
                  prompt: firstNarrative,
                  genre: game.genre,
                  style: 'comic_book',
                  aspectRatio: 'landscape'
                }).then((result) => {
                  console.log(`Hero screen image preload: complete`)
                  // Update the message with the generated image
                  handleImageGenerated(finalMessage.id, result)
                  setLoadingProgress(prev => ({ ...prev, images: true }))
                }).catch(err => {
                  console.error('Hero screen image preload error:', err)
                  // Continue anyway - show gameplay even if image failed
                  handleImageGenerated(finalMessage.id, { imageUrl: null, model: 'failed', timestamp: Date.now() })
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
    // Note: Don't set isStarting to false yet - let image loading complete
  }

  // Handle when images are ready from ComicPanelCard
  const handleImagesReady = () => {
    setLoadingProgress(prev => ({ ...prev, images: true }))
    // Mark images as ready for the pending option
    setResponseReady(prev => ({ ...prev, images: true }))
  }

  // Transition to game screen when initial content is ready
  useEffect(() => {
    if (loadingProgress.text && loadingProgress.images) {
      setIsPlaying(true)
      setIsStarting(false)
    }
  }, [loadingProgress.text, loadingProgress.images])

  // Stop waiting when both text AND images are ready for the selected option
  useEffect(() => {
    if (isWaitingForResponse && responseReady.text && responseReady.images) {
      setIsWaitingForResponse(false)
      setPendingOptionId(null) // Reset selected button styling for next panel
    }
  }, [responseReady.text, responseReady.images, isWaitingForResponse])

  const sendMessage = async (message: string) => {
    if (!sessionId || !message.trim()) return

    setIsWaitingForResponse(true)
    setResponseReady({ text: false, images: false })
    setUserInput('')

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
        // Try to parse error response for game completion
        let errorMessage = 'Failed to send message'
        try {
          const errorData = await response.json()
          if (errorData.error && errorData.gameComplete) {
            errorMessage = errorData.error
          }
        } catch {
          // Fallback to generic error if JSON parsing fails
        }
        throw new Error(errorMessage)
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

                    // Strip options from content to avoid repetition
                    const content = lastMessage.content
                    const optionStartRegex = /[\n\r]+\s*1[.)]\s+/
                    const match = content.match(optionStartRegex)

                    if (match && match.index && currentOptions.length > 0) {
                      lastMessage.content = content.substring(0, match.index).trim()
                    }
                  }
                  return newMessages
                })

                // Mark text as ready
                setResponseReady(prev => ({ ...prev, text: true }))

                // Start image generation immediately after text is complete
                if (currentMessage) {
                  const { narrative } = parsePanel(currentMessage)
                  ImageGenerationService.generateImage({
                    prompt: narrative,
                    genre: game.genre,
                    style: 'comic_book',
                    aspectRatio: 'landscape'
                  }).then(result => {
                    handleImageGenerated(messageId, result)
                    setResponseReady(prev => ({ ...prev, images: true }))
                  }).catch(err => {
                    console.error('Image generation failed:', err)
                    handleImageGenerated(messageId, { imageUrl: null, model: 'failed', timestamp: Date.now() })
                    setResponseReady(prev => ({ ...prev, images: true }))
                  })
                }
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
        // Game has ended naturally - don't show as error
        console.log('Game completed - this is expected behavior')
        // Remove the user message since game can't continue
        setMessages(prev => prev.filter(m => m.id !== userMessage.id))
      } else {
        // Actual error - remove user message and show error
        setMessages(prev => prev.filter(m => m.id !== userMessage.id))
      }
    } finally {
      setIsWaitingForResponse(false)
      setPendingOptionId(null)
    }
  }

  const handleImageGenerated = (messageId: string, result: ImageGenerationResult) => {
    setMessages(prev => {
      const newMessages = [...prev]
      const targetMessage = newMessages.find(m => m.id === messageId)
      if (targetMessage) {
        targetMessage.imageModel = result.model
        targetMessage.narrativeImage = result.imageUrl || null
        
        // Initialize or update image history
        if (!targetMessage.imageHistory) {
          targetMessage.imageHistory = [{
            url: result.imageUrl,
            model: result.model,
            timestamp: result.timestamp
          }]
        } else {
          targetMessage.imageHistory.push({
            url: result.imageUrl,
            model: result.model,
            timestamp: result.timestamp
          })
        }
      }
      return newMessages
    })
  }

  const handleImageRating = (messageId: string, rating: number) => {
    // Record feedback to optimize model selection
    const message = messages.find(m => m.id === messageId)
    if (message?.imageModel) {
      ImageGenerationService.recordModelFeedback(message.imageModel, rating)
    }

    // Update UI to show rating
    setMessages(prev => {
      const newMessages = [...prev]
      const targetMessage = newMessages.find(m => m.id === messageId)
      if (targetMessage) {
        targetMessage.imageRating = rating
      }
      return newMessages
    })
  }

  const handleOptionClick = (option: GameplayOption) => {
    setPendingOptionId(option.id)
    setResponseReady({ text: false, images: false })

    // Track user choice for NFT metadata
    setUserChoices(prev => [...prev, {
      panelIndex: assistantMessageCount, // Current panel index
      choice: option.text,
      timestamp: new Date().toISOString()
    }])

    // Start loading next panel in background
    // User stays on current panel while content loads
    sendMessage(option.text)
  }

  // Handle image regeneration for a specific panel
  const handleImageRegenerate = async (messageId: string, narrativeText: string, customPrompt?: string) => {
    if (regeneratingMessageId) return // Already regenerating

    setRegeneratingMessageId(messageId)

    try {
      // Use custom prompt if provided, otherwise use the narrative text
      const promptToUse = customPrompt || narrativeText

      const result = await ImageGenerationService.generateImage({
        prompt: promptToUse,
        genre: game.genre,
        style: 'comic_book',
        aspectRatio: 'landscape',
        force: true  // Bypass cache for regeneration
      })

      // Update the message with the new image
      setMessages(prev => {
        const newMessages = [...prev]
        const targetMessage = newMessages.find(m => m.id === messageId)
        if (targetMessage) {
          targetMessage.imageModel = result.model
          targetMessage.narrativeImage = result.imageUrl || null
          targetMessage.imageRating = undefined // Reset rating for new image
        }
        return newMessages
      })

      toast({
        title: '✨ Image regenerated',
        description: customPrompt ? 'New image created with your custom prompt' : 'New image generated successfully',
      })

      console.log(`Image regenerated for panel ${messageId}: ${result.model}${customPrompt ? ' (custom prompt)' : ''}`)
    } catch (error) {
      console.error('Image regeneration failed:', error)
      toast({
        title: 'Regeneration failed',
        description: 'Could not generate new image. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setRegeneratingMessageId(null)
    }
  }

  // Handle panel text changes from ComicBookFinale
  const handlePanelTextChange = (panelIndex: number, newText: string) => {
    const assistantMessages = messages.filter(m => m.role === 'assistant')
    const targetMessage = assistantMessages[panelIndex]

    if (targetMessage) {
      // Update the message content
      setMessages(prev => {
        const newMessages = [...prev]
        const msgToUpdate = newMessages.find(m => m.id === targetMessage.id)
        if (msgToUpdate) {
          msgToUpdate.content = newText
        }
        return newMessages
      })

      // Track edit for potential future use
      _setEditedPanels((prev: Record<string, string>) => ({
        ...prev,
        [targetMessage.id]: newText
      }))

      toast({
        title: '📝 Text updated',
        description: `Panel ${panelIndex + 1} narrative saved`,
      })

      console.log(`Panel ${panelIndex} text updated`)
    }
  }

  const buildComicPanels = (): ComicBookFinalePanelData[] => {
    const assistantMessages = messages.filter(m => m.role === 'assistant').slice(0, MAX_COMIC_PANELS)

    return assistantMessages.map((message, _idx) => {
      // Find the user's choice that comes after this assistant message
      const messageIndex = messages.indexOf(message)
      const nextUserMessage = messages
        .slice(messageIndex + 1)
        .find(m => m.role === 'user')

      return {
        id: message.id,
        narrativeText: message.content,
        imageUrl: message.narrativeImage || null,
        imageModel: message.imageModel || 'unknown',
        userChoice: nextUserMessage?.content || undefined,
      }
    })
  }

  const handleMintComic = async (panelData: ComicBookFinalePanelData[], metadata?: { nftMetadataUri: string; gameMetadataUri: string; creator: GameCreator; author: GameAuthor }) => {
    setIsMinting(true)
    try {
      // Build NFT metadata with full attribution to original author
      const nftMetadata = {
        name: game.title,
        description: game.description,
        image: panelData[0]?.imageUrl || undefined,
        attributes: [
          { trait_type: 'Genre', value: game.genre },
          { trait_type: 'Subgenre', value: game.subgenre },
          { trait_type: 'Difficulty', value: game.difficulty || 'standard' },
          { trait_type: 'Panels', value: String(panelData.length) },
        ],
        // SOURCE MATERIAL ATTRIBUTION (critical for Story Protocol IP rights)
        sourceArticle: {
          url: game.articleUrl || undefined,
          author: game.authorParagraphUsername || 'Unknown Author',
          authorWallet: game.authorWallet || undefined,
          publication: game.publicationName || 'Unknown Publication',
        },
        // DERIVATIVE WORK ATTRIBUTION
        creator: {
          wallet: game.creatorWallet || undefined,
          timestamp: new Date().toISOString(),
        },
        // GAME METADATA
        game: {
          title: game.title,
          tagline: game.tagline,
          promptModel: game.promptModel,
          promptName: game.promptName,
        },
      }

      // Use provided metadata URIs if available, otherwise fall back to custom logic
      if (metadata) {
        console.log('Minting comic with enhanced metadata:', {
          nftMetadataUri: metadata.nftMetadataUri,
          gameMetadataUri: metadata.gameMetadataUri,
          creator: metadata.creator,
          author: metadata.author,
          panels: panelData.length,
          sourceAuthor: game.authorParagraphUsername,
          sourceAuthorWallet: game.authorWallet,
          gameCreator: game.creatorWallet,
        })

        // Call backend API to initiate NFT minting with enhanced metadata
        const mintResponse = await fetch('/api/games/mint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: game.id,
            gameSlug: game.slug,
            metadata: nftMetadata,
            panels: panelData.length,
            // Enhanced metadata with proper attribution
            nftMetadataUri: metadata.nftMetadataUri,
            gameMetadataUri: metadata.gameMetadataUri,
            creator: metadata.creator,
            author: metadata.author,
          }),
        })

        if (!mintResponse.ok) {
          const errorData = await mintResponse.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to mint NFT')
        }

        const mintData = await mintResponse.json()
        console.log('NFT minting initiated:', mintData)

        // Confirm mint server-side: extracts assets + returns extractedAssetIds
        const confirmResponse = await fetch('/api/games/mint', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: game.id,
            transactionHash: mintData.transactionHash || mintData.data?.transactionHash || 'pending',
            tokenId: mintData.tokenId || mintData.data?.tokenId,
          }),
        })
        if (confirmResponse.ok) {
          const confirmData = await confirmResponse.json()
          if (confirmData.data?.extractedAssetIds?.length) {
            setExtractedAssetIds(confirmData.data.extractedAssetIds)
          }
        }
        // Show success - NFT minting is in progress
        toast({ title: '🎉 NFT minting started!', description: mintData.transactionHash ? `Transaction: ${mintData.transactionHash}` : 'Your NFT is being minted on Base.' })
      } else {
        // Fallback to original minting logic
        console.log('Minting comic with basic metadata:', {
          nftMetadata,
          panels: panelData.length,
          sourceAuthor: game.authorParagraphUsername,
          sourceAuthorWallet: game.authorWallet,
          gameCreator: game.creatorWallet,
        })

        // Call backend API to initiate NFT minting
        const mintResponse = await fetch('/api/games/mint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: game.id,
            gameSlug: game.slug,
            metadata: nftMetadata,
            panels: panelData.length,
          }),
        })

        if (!mintResponse.ok) {
          const errorData = await mintResponse.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to mint NFT')
        }

        const mintData = await mintResponse.json()
        console.log('NFT minting initiated:', mintData)

        // Confirm mint server-side: extracts assets + returns extractedAssetIds
        const confirmResponse2 = await fetch('/api/games/mint', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: game.id,
            transactionHash: mintData.transactionHash || mintData.data?.transactionHash || 'pending',
            tokenId: mintData.tokenId || mintData.data?.tokenId,
          }),
        })
        if (confirmResponse2.ok) {
          const confirmData2 = await confirmResponse2.json()
          if (confirmData2.data?.extractedAssetIds?.length) {
            setExtractedAssetIds(confirmData2.data.extractedAssetIds)
          }
        }
        // Show success - NFT minting is in progress
        toast({ title: '🎉 NFT minting started!', description: mintData.transactionHash ? `Transaction: ${mintData.transactionHash}` : 'Your NFT is being minted on Base.' })
      }
    } catch (error) {
      console.error('Mint failed:', error)
      toast({ title: 'Minting failed', description: error instanceof Error ? error.message : 'Failed to mint comic. Please try again.', variant: 'destructive' })
    } finally {
      setIsMinting(false)
    }
  }

  const _handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(userInput)
    }
  }

  // HERO SCREEN - Before game starts
  if (!isPlaying) {
    return (
      <div className="fixed inset-0 w-full h-full overflow-hidden bg-black">
        {/* Background Image */}
        {game.imageUrl && (
          <div className="absolute inset-0">
            <img
              src={game.imageUrl}
              alt={game.title}
              className="w-full h-full object-cover"
            />
            {/* Multiple gradient overlays for better text contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black/90"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
          </div>
        )}

        {/* Content */}
        <div className="relative w-full h-full flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-4 md:space-y-6 my-auto">
            {/* Genre Badge */}
            <div
              className="inline-block px-3 md:px-4 py-1.5 md:py-2 rounded-full border text-xs md:text-sm font-semibold backdrop-blur-sm"
              style={{
                borderColor: game.primaryColor || '#8b5cf6',
                color: game.primaryColor || '#8b5cf6',
                backgroundColor: `${game.primaryColor || '#8b5cf6'}20`,
              }}
            >
              {game.genre} • {game.subgenre}
            </div>

            {/* Title with responsive sizing */}
            <h1
              className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold leading-tight drop-shadow-lg"
              style={{ color: game.primaryColor || '#8b5cf6' }}
            >
              {game.title}
            </h1>

            {/* Tagline with responsive sizing */}
            <blockquote
              className="text-base sm:text-lg md:text-2xl italic opacity-90 drop-shadow-md max-w-xl"
              style={{ color: game.primaryColor || '#8b5cf6' }}
            >
              "{game.tagline}"
            </blockquote>

            {/* Description with responsive sizing */}
            <p className="text-gray-200 text-sm sm:text-base md:text-lg max-w-xl drop-shadow-md leading-relaxed">
              {game.description}
            </p>

            {/* CTA Button with responsive sizing */}
            <div className="mt-6 sm:mt-8 pt-4">
              <div className="relative">
                <Button
                  onClick={handleStartClick}
                  disabled={isStarting}
                  size="lg"
                  className="w-full text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 rounded-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 relative z-10"
                  style={{
                    backgroundColor: game.primaryColor || '#8b5cf6',
                    color: 'white',
                  }}
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-5 h-5 md:w-6 md:h-6 mr-2 animate-spin" />
                      <span>
                        {!loadingProgress.text ? 'Crafting your story...' :
                          !loadingProgress.images ? 'Generating visuals...' :
                            'Almost ready...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 md:w-6 md:h-6 mr-2 fill-current" />
                      <span>Start Game</span>
                    </>
                  )}
                </Button>

                {/* Glow effect when starting */}
                {isStarting && (
                  <div
                    className="absolute inset-0 rounded-lg animate-glow pointer-events-none"
                    style={{
                      backgroundColor: 'transparent',
                      boxShadow: `0 0 20px ${game.primaryColor || '#8b5cf6'}60`,
                    }}
                  />
                )}
              </div>

              {/* Loading Progress Indicators */}
              {isStarting && (
                <div className="mt-6 flex items-center justify-center gap-3 animate-slide-up">
                  <div className="space-y-2 w-full max-w-xs">
                    {/* Story generation */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full transition-all duration-700 ${loadingProgress.text ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                          }`}
                      />
                      <span className="text-xs text-gray-300">Crafting narrative</span>
                      {loadingProgress.text && (
                        <span className="text-xs text-green-400 ml-auto">✓</span>
                      )}
                    </div>

                    {/* Image generation */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full transition-all duration-700 ${loadingProgress.images ? 'bg-green-500' : 'bg-gray-600 animate-pulse'
                          }`}
                      />
                      <span className="text-xs text-gray-300">Generating visuals</span>
                      {loadingProgress.images && (
                        <span className="text-xs text-green-400 ml-auto">✓</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Tips section with micro-interactions */}
            <motion.div
              className="md:hidden mt-8 pt-4 border-t border-white/20 text-xs text-gray-300 max-w-xs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 mt-0.5 text-yellow-400 flex-shrink-0" />
                <p>💡 <span className="text-white font-medium">Pro Tip:</span> Make choices carefully - every decision shapes your story</p>
              </div>
            </motion.div>
          </div>
        </div>
        {/* Payment Modal Overlay */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 border border-purple-500/30 rounded-xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto">
                  <div className="text-3xl">🪙</div>
                </div>

                <h3 className="text-xl font-bold text-white">Insert Coin to Play</h3>

                <p className="text-gray-400">
                  This arcade cabinet requires a credit of <br />
                  <span className="text-xl font-bold text-purple-400">{game.playFee} $DONUT</span>
                </p>

                <div className="text-xs text-gray-500 bg-gray-950 p-3 rounded border border-gray-800">
                  Funds are automatically split between the Game Creator and the Original Article Author via Story Protocol.
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePaymentConfirm}
                    disabled={isPaying}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Paying...
                      </>
                    ) : (
                      'Confirm Payment'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    )
  }

  const handleRegisterDerivativeIp = async () => {
    if (!walletClient || !extractedAssetIds.length) return
    if (!isOnStoryNetwork(chainId)) {
      switchChain({ chainId: STORY_CHAIN_ID })
      return
    }
    setIsRegisteringDerivative(true)
    try {
      const storyClient = createStoryClientFromWallet(walletClient)
      if (!storyClient) throw new Error('Failed to initialize Story Protocol client')
      const parentIpId = game.storyIpId as `0x${string}` | undefined
      if (!parentIpId) throw new Error('Parent game has no Story Protocol IP ID — register the game as IP first via the IP Registration button')
      // mintAndRegisterIpAndMakeDerivative: mints a new NFT on Story's SPG,
      // registers it as an IP Asset, and links it as a derivative of the parent
      // game IP — all in one transaction. No pre-existing child IP needed.
      for (const assetId of extractedAssetIds) {
        await storyClient.ipAsset.mintAndRegisterIpAndMakeDerivative({
          spgNftContract: STORY_SPG_CONTRACT,
          derivData: {
            parentIpIds: [parentIpId],
            licenseTermsIds: [BigInt(1)], // default PIL on Aeneid testnet
          },
          ipMetadata: {
            // ?ipMetadata=true returns Story Protocol-compatible flat JSON
            ipMetadataURI: `https://writersarcade.vercel.app/api/assets/${assetId}?ipMetadata=true`,
          },
        })
        console.log('Registered derivative IP for asset:', assetId)
      }
      setDerivativeRegistered(true)
      toast({ title: '✅ Derivative IP registered', description: `${extractedAssetIds.length} asset(s) minted and linked to parent IP on Story Protocol.` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      toast({ title: 'Derivative IP registration failed', description: msg, variant: 'destructive' })
    } finally {
      setIsRegisteringDerivative(false)
    }
  }

  // COMIC FINALE SCREEN - Story completion view
  if (showComicFinale) {
    const onStoryNetwork = isOnStoryNetwork(chainId)
    return (
      <div>
        <ComicBookFinale
          gameTitle={game.title}
          genre={game.genre}
          primaryColor={game.primaryColor || '#8b5cf6'}
          panels={buildComicPanels()}
          onBack={() => setShowComicFinale(false)}
          onMint={handleMintComic}
          isMinting={isMinting}
          creatorWallet={game.creatorWallet || 'Unknown Creator'}
          articleUrl={game.articleUrl || ''}
          authorParagraphUsername={game.authorParagraphUsername || 'Unknown Author'}
          authorWallet={game.authorWallet}
          difficulty={game.difficulty || 'medium'}
          userChoices={userChoices}
          onPanelTextChange={handlePanelTextChange}
        />
        {extractedAssetIds.length > 0 && !derivativeRegistered && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-gray-700 rounded-xl px-6 py-4 flex flex-col items-center gap-3 shadow-2xl max-w-sm w-full mx-4">
            <p className="text-sm text-gray-300 text-center">
              <span className="font-semibold text-white">{extractedAssetIds.length} asset{extractedAssetIds.length > 1 ? 's' : ''} extracted</span> — register as derivative IP on Story Protocol to establish royalty chains.
            </p>
            {!game.storyIpId ? (
              <p className="text-xs text-amber-400 text-center">
                Register this game as IP first using the IP Registration button above, then return here to link derivative assets.
              </p>
            ) : !onStoryNetwork ? (
              <Button
                onClick={() => switchChain({ chainId: STORY_CHAIN_ID })}
                disabled={isSwitchingChain}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white"
              >
                {isSwitchingChain ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
                Switch to Story Network
              </Button>
            ) : (
              <Button
                onClick={handleRegisterDerivativeIp}
                disabled={isRegisteringDerivative}
                className="w-full bg-white text-black hover:bg-gray-100"
              >
                {isRegisteringDerivative ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isRegisteringDerivative ? 'Registering…' : 'Register Derivative IP on Story'}
              </Button>
            )}
          </div>
        )}
        {derivativeRegistered && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-green-700 rounded-xl px-6 py-3 text-green-400 text-sm text-center shadow-2xl">
            ✅ Derivative IP registered on Story Protocol
          </div>
        )}
      </div>
    )
  }

  // NEW: Block gameplay if game not approved
  if (game.approvalStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="text-6xl">❌</div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Game Rejected</h2>
            <p className="text-gray-400 mb-2">{game.rejectionReason || 'This game did not match the article themes.'}</p>
            <p className="text-gray-400 text-sm">You can regenerate and try again.</p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (game.approvalStatus === 'pending') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="text-6xl">⏳</div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Game Awaiting Review</h2>
            <p className="text-gray-400">This game needs to be approved before you can play. Review it and confirm it matches the original article.</p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // GAME PLAY SCREEN - During game
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
          // Loading State - Enhanced with brand theme
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="loading-spinner mx-auto" />
              <p className="text-gray-400 animate-pulse">Generating your story...</p>
            </div>
          </div>
        ) : (
          // Comic Panel Display - Enhanced with animations
          <div className="w-full flex flex-col items-center justify-center min-h-full p-4 md:p-8 py-6 md:py-8 animate-slide-in">
            {/* Story Progress Bar */}
            <div className="w-full max-w-5xl mb-8 pb-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Story Progress</p>
                <p className="text-sm text-gray-500">Panel {assistantMessageCount} of {MAX_COMIC_PANELS}</p>
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

            {/* Current Comic Panel - Show current panel while next loads in background */}
            <div className="w-full space-y-8">
              {messages.map((message, idx) => {
                // Only render assistant messages that have options (completed/ready to interact)
                if (message.role !== 'assistant' || !message.options || message.options.length === 0) {
                  return null
                }

                // Only show the LATEST panel with options
                const remainingMessages = messages.slice(idx + 1)
                const hasLaterCompletedPanel = remainingMessages.some(m => m.role === 'assistant' && m.options && m.options.length > 0)

                if (hasLaterCompletedPanel) return null

                // NEW LOGIC: Show current panel immediately, even if image isn't ready yet
                // This allows user to stay on current panel while next one loads in background
                const imageReady = message.narrativeImage !== undefined

                // Show this panel regardless of image readiness
                return (
                  <div key={message.id} className="animate-in fade-in duration-700 ease-out">
                    <ComicPanelCard
                      messageId={message.id}
                      narrativeText={message.content}
                      genre={game.genre}
                      primaryColor={game.primaryColor || '#8b5cf6'}
                      options={message.options || []}
                      onOptionSelect={handleOptionClick}
                      isWaiting={isWaitingForResponse}
                      onImageRating={(rating) => handleImageRating(message.id, rating)}
                      onImagesReady={handleImagesReady}
                      onImageRegenerate={(narrativeText, customPrompt) => handleImageRegenerate(message.id, narrativeText, customPrompt)}
                      isRegenerating={regeneratingMessageId === message.id}
                      pendingOptionId={pendingOptionId}
                      responseReady={responseReady}
                      narrativeImage={message.narrativeImage || undefined}
                      imageModel={message.imageModel}
                      shouldRevealContent={true}
                      showLoadingState={!imageReady && isWaitingForResponse}
                      // Enhanced with theme selection
                      availableThemes={availableThemes}
                      currentTheme={game.primaryColor || 'default'}
                      onThemeSelect={handleThemeSelect}
                      // Enhanced with AI prompt suggestions
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

      {/* Input Area - Fixed at Bottom */}
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
                <p className="text-sm text-gray-400 mt-2">
                  Your {MAX_COMIC_PANELS}-panel adventure has concluded. View and mint your comic as an NFT.
                </p>
              </div>
              <Button
                onClick={() => setShowComicFinale(true)}
                className="w-full h-12 font-semibold transition-all duration-200 hover:shadow-lg"
                style={{
                  backgroundColor: game.primaryColor || '#8b5cf6',
                  color: 'white',
                }}
              >
                <BookOpen className="w-5 h-5 mr-2" />
                View & Mint Comic
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* NEW: Narrative Preview Modal - Enhanced with Visual Storyboard */}
      <NarrativePreviewModal
        isOpen={showPreview}
        game={game}
        firstPanelNarrative={messages.length > 0 ? messages[0]?.content : undefined}
        firstPanelOptions={messages.length > 0 ? (messages[0]?.options || []) : []}
        storyboardPanels={generateStoryboardPreview()}
        onClose={() => setShowPreview(false)}
        onStart={handlePreviewApproved}
        isLoading={isStarting}
      />
    </div>
  )
}