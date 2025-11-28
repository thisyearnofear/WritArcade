'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Play, Send, BookOpen } from 'lucide-react'
import { Game, ChatMessage, GameplayOption } from '../types'
import { ImageGenerationService, type ImageGenerationResult } from '../services/image-generation.service'
import { ComicPanelCard } from './comic-panel-card'
import { ComicBookFinale, type ComicBookFinalePanelData } from './comic-book-finale'
import { parsePanel } from '../utils/text-parser'

interface GamePlayInterfaceProps {
  game: Game
}

interface ChatEntry extends ChatMessage {
  options?: GameplayOption[]
  imageModel?: string             // Which Venice AI model generated this image
  imageRating?: number            // User rating (1-5) for this image
  narrativeImage?: string | null  // Comic panel image URL
}

const MAX_COMIC_PANELS = 5

export function GamePlayInterface({ game }: GamePlayInterfaceProps) {
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const assistantMessageCount = messages.filter(m => m.role === 'assistant').length
  const canAddMorePanels = assistantMessageCount < MAX_COMIC_PANELS

  // Disabled auto-scroll to prevent scrolling when user clicks options
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  // }, [messages])

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
    
    sendMessage(option.text)
  }

  const buildComicPanels = (): ComicBookFinalePanelData[] => {
    const assistantMessages = messages.filter(m => m.role === 'assistant').slice(0, MAX_COMIC_PANELS)
    
    return assistantMessages.map((message, idx) => {
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

  const handleMintComic = async (panelData: ComicBookFinalePanelData[], metadata?: any) => {
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

      console.log('Minting comic with full author attribution:', {
        nftMetadata,
        panels: panelData.length,
        sourceAuthor: game.authorParagraphUsername,
        sourceAuthorWallet: game.authorWallet,
        gameCreator: game.creatorWallet,
      })

      // TODO: Implement contract call with metadata URIs via GameNFT contract
      // Should include:
      // 1. Register game as derivative IP asset via Story Protocol
      // 2. Set parent IP (article) and link to original author
      // 3. Attach royalty terms ensuring author receives share of future plays/mints
      // 4. Mint NFT with comprehensive metadata
      alert('Minting with full attribution coming soon!')
    } catch (error) {
      console.error('Mint failed:', error)
      alert('Failed to mint comic')
    } finally {
      setIsMinting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
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

            {/* Title */}
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight drop-shadow-lg"
              style={{ color: game.primaryColor || '#8b5cf6' }}
            >
              {game.title}
            </h1>

            {/* Tagline */}
            <blockquote
              className="text-lg md:text-2xl italic opacity-90 drop-shadow-md max-w-xl"
              style={{ color: game.primaryColor || '#8b5cf6' }}
            >
              "{game.tagline}"
            </blockquote>

            {/* Description */}
            <p className="text-gray-200 text-sm md:text-base lg:text-lg max-w-xl drop-shadow-md leading-relaxed">
              {game.description}
            </p>

            {/* CTA Button */}
             <div className="mt-6 md:mt-8 pt-4">
               <div className="relative">
                 <Button
                   onClick={startGame}
                   disabled={isStarting}
                   size="lg"
                   className="w-full text-base md:text-lg px-6 md:px-8 py-5 md:py-6 rounded-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 relative z-10"
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
                         className={`w-2 h-2 rounded-full transition-all duration-700 ${
                           loadingProgress.text ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
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
                         className={`w-2 h-2 rounded-full transition-all duration-700 ${
                           loadingProgress.images ? 'bg-green-500' : 'bg-gray-600 animate-pulse'
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

            {/* Optional: Tips section on mobile */}
            <div className="md:hidden mt-8 pt-4 border-t border-white/20 text-xs text-gray-300 max-w-xs">
              <p>💡 Make choices carefully - every decision shapes your story</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // COMIC FINALE SCREEN - Story completion view
  if (showComicFinale) {
    return (
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
      />
    )
  }

  // GAME PLAY SCREEN - During game
  return (
    <div
      className="min-h-screen w-full flex flex-col"
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
              <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: game.primaryColor || '#8b5cf6' }} />
              <p className="text-gray-400">Generating your story...</p>
            </div>
          </div>
        ) : (
          // Comic Panel Display
           <div className="w-full flex flex-col items-center justify-center min-h-full p-4 md:p-8 py-6 md:py-8">
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

            {/* Current Comic Panel - Only show when BOTH text and images are ready */}
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

                 // GATE: Only show panel if image is ready (text always ready at this point)
                 const imageReady = message.narrativeImage !== undefined
                 if (!imageReady) {
                   return (
                     <div key={message.id} className="h-64 flex items-center justify-center">
                       <div className="text-center space-y-3">
                         <Loader2
                           className="w-8 h-8 animate-spin mx-auto"
                           style={{ color: game.primaryColor || '#8b5cf6' }}
                         />
                         <p className="text-sm text-gray-400">Preparing your panel...</p>
                       </div>
                     </div>
                   )
                 }

                 // Show this panel only when image is ready
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
                       onImageGenerated={(result) => handleImageGenerated(message.id, result)}
                       onImageRating={(rating) => handleImageRating(message.id, rating)}
                       onImagesReady={handleImagesReady}
                       pendingOptionId={pendingOptionId}
                       responseReady={responseReady}
                       narrativeImage={message.narrativeImage || undefined}
                       imageModel={message.imageModel}
                       shouldRevealContent={true}
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
    </div>
  )
}