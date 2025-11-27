'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Play, Send, MessageCircle, Image as ImageIcon } from 'lucide-react'
import { Game, ChatMessage, GameplayOption } from '../types'
import { ImageGenerationService } from '../services/image-generation.service'

interface GamePlayInterfaceProps {
  game: Game
}

interface ChatEntry extends ChatMessage {
  options?: GameplayOption[]
  narrativeImage?: string  // Per-turn generated image
  isGeneratingImage?: boolean
}

// Utility: Parse markdown formatting from text
function parseMarkdownText(
  text: string,
  primaryColor: string = '#8b5cf6'
): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  let lastIndex = 0
  const boldRegex = /\*\*(.+?)\*\*/g
  let match

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    parts.push(
      <span key={`bold-${match.index}`} className="font-bold" style={{ color: primaryColor }}>
        {match[1]}
      </span>
    )
    lastIndex = boldRegex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

export function GamePlayInterface({ game }: GamePlayInterfaceProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [isStarting, setIsStarting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const [showMobileImage, setShowMobileImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startGame = async () => {
    setIsStarting(true)

    try {
      const sessionResponse = await fetch('/api/session/new')
      const sessionData = await sessionResponse.json()

      if (!sessionData.success) {
        throw new Error('Failed to create session')
      }

      const newSessionId = sessionData.data.sessionId
      setSessionId(newSessionId)

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

                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.content = currentMessage
                  } else {
                    newMessages.push({
                      id: `temp-${Date.now()}`,
                      sessionId: newSessionId,
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
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]
                  if (lastMessage) {
                    lastMessage.options = currentOptions

                    // Strip options from content to avoid repetition
                    const content = lastMessage.content
                    const optionStartRegex = /[\n\r]+\s*1[.)]\s+/
                    const match = content.match(optionStartRegex)

                    if (match && match.index && currentOptions.length > 0) {
                      lastMessage.content = content.substring(0, match.index).trim()
                    }

                    // Trigger image generation for this narrative moment
                    if (lastMessage.content && !lastMessage.narrativeImage) {
                      lastMessage.isGeneratingImage = true
                      generateNarrativeImage(lastMessage)
                    }
                  }
                  return newMessages
                })
              }
            } catch (error) {
              console.error('Error parsing stream data:', error)
            }
          }
        }
      }

      setIsPlaying(true)

    } catch (error) {
      console.error('Failed to start game:', error)
    } finally {
      setIsStarting(false)
    }
  }

  const sendMessage = async (message: string) => {
    if (!sessionId || !message.trim()) return

    setIsWaitingForResponse(true)
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
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]
                  if (lastMessage) {
                    lastMessage.options = currentOptions

                    // Strip options from content to avoid repetition
                    const content = lastMessage.content
                    const optionStartRegex = /[\n\r]+\s*1[.)]\s+/
                    const match = content.match(optionStartRegex)

                    if (match && match.index && currentOptions.length > 0) {
                      lastMessage.content = content.substring(0, match.index).trim()
                    }

                    // Trigger image generation for this narrative moment
                    if (lastMessage.content && !lastMessage.narrativeImage) {
                      lastMessage.isGeneratingImage = true
                      generateNarrativeImage(lastMessage)
                    }
                  }
                  return newMessages
                })
              }
            } catch (error) {
              console.error('Error parsing stream data:', error)
            }
          }
        }
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
    } finally {
      setIsWaitingForResponse(false)
    }
  }

  const generateNarrativeImage = async (message: ChatEntry) => {
    try {
      const imageUrl = await ImageGenerationService.generateNarrativeImage({
        narrative: message.content,
        genre: game.genre,
        primaryColor: game.primaryColor,
      })

      if (imageUrl) {
        setMessages(prev => {
          const newMessages = [...prev]
          const targetMessage = newMessages.find(m => m.id === message.id)
          if (targetMessage) {
            targetMessage.narrativeImage = imageUrl
            targetMessage.isGeneratingImage = false
          }
          return newMessages
        })
      } else {
        // Clear loading state even if generation failed
        setMessages(prev => {
          const newMessages = [...prev]
          const targetMessage = newMessages.find(m => m.id === message.id)
          if (targetMessage) {
            targetMessage.isGeneratingImage = false
          }
          return newMessages
        })
      }
    } catch (error) {
      console.error('Failed to generate narrative image:', error)
      // Clear loading state on error
      setMessages(prev => {
        const newMessages = [...prev]
        const targetMessage = newMessages.find(m => m.id === message.id)
        if (targetMessage) {
          targetMessage.isGeneratingImage = false
        }
        return newMessages
      })
    }
  }

  const handleOptionClick = (option: GameplayOption) => {
    sendMessage(option.text)
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
            <div className="mt-6 md:mt-8 pt-2">
              <Button
                onClick={startGame}
                disabled={isStarting}
                size="lg"
                className="text-base md:text-lg px-6 md:px-8 py-5 md:py-6 rounded-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50"
                style={{
                  backgroundColor: game.primaryColor || '#8b5cf6',
                  color: 'white',
                }}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 mr-2 animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 md:w-6 md:h-6 mr-2 fill-current" />
                    <span>Start Game</span>
                  </>
                )}
              </Button>
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
          // Story Cards
          <div className="w-full max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-8">
            {messages.map((message, idx) => {
              // Only show assistant messages as story cards
              if (message.role !== 'assistant') return null

              return (
                <div key={message.id} className="space-y-4 md:space-y-6 animate-fade-in">
                  {/* Story Card */}
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm shadow-2xl">
                    {/* Image Container - Prioritize narrative image, fallback to game cover */}
                    {(message.narrativeImage || message.isGeneratingImage || game.imageUrl) && (
                      <div className="w-full h-64 md:h-96 overflow-hidden bg-black/60 relative group">
                        {message.isGeneratingImage && !message.narrativeImage ? (
                          // Loading state
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center space-y-2">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: game.primaryColor || '#8b5cf6' }} />
                              <p className="text-xs text-gray-400">Visualizing...</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <img
                              src={message.narrativeImage || game.imageUrl || ''}
                              alt="Story scene"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {/* Image overlay gradient */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60"></div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Narrative Content */}
                    <div className="p-6 md:p-8 space-y-4">
                      {/* Narrative Text - Formatted for readability */}
                      <div className="space-y-3 text-base md:text-lg">
                        {message.content.split('\n').map((line, lineIdx) => {
                          if (!line.trim()) {
                            return <div key={`empty-${lineIdx}`} className="h-2" />
                          }
                          return (
                            <p key={`line-${lineIdx}`} className="text-gray-100 leading-relaxed">
                              {parseMarkdownText(line, game.primaryColor)}
                            </p>
                          )
                        })}
                      </div>

                      {/* Options - Only show after thinking is done */}
                      {message.options && message.options.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                          <p className="text-sm text-gray-400 uppercase tracking-wide font-semibold">
                            What will you do?
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {message.options.map((option) => (
                              <button
                                key={option.id}
                                onClick={() => handleOptionClick(option)}
                                disabled={isWaitingForResponse}
                                className="group relative text-left p-4 rounded-lg border-2 transition-all duration-200 disabled:opacity-50 hover:scale-105 active:scale-95"
                                style={{
                                  borderColor: game.primaryColor || '#8b5cf6',
                                  backgroundColor: `${game.primaryColor || '#8b5cf6'}10`,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = `${game.primaryColor || '#8b5cf6'}30`
                                  e.currentTarget.style.boxShadow = `0 0 20px ${game.primaryColor || '#8b5cf6'}40`
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = `${game.primaryColor || '#8b5cf6'}10`
                                  e.currentTarget.style.boxShadow = 'none'
                                }}
                              >
                                {/* Option Number Badge */}
                                <div
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white mb-2"
                                  style={{
                                    backgroundColor: game.primaryColor || '#8b5cf6',
                                  }}
                                >
                                  {option.id}
                                </div>

                                {/* Option Text */}
                                <p className="font-semibold text-gray-100 text-sm md:text-base leading-tight">
                                  {parseMarkdownText(option.text, game.primaryColor)}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Show thinking state after narrative if waiting for response */}
                  {isWaitingForResponse && idx === messages.length - 1 && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: game.primaryColor || '#8b5cf6' }} />
                      <span className="text-sm md:text-base">Your decision echoes... the story unfolds...</span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* User Action Display */}
            {messages.some((m) => m.role === 'user') && (
              <div className="text-center py-4 text-gray-500 text-sm">
                ↓ Your next chapter awaits ↓
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div
        className="border-t border-white/10 p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-md"
        style={{
          boxShadow: `0 -4px 20px ${game.primaryColor || '#8b5cf6'}10`,
        }}
      >
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex gap-3">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="What will you do? (Shift+Enter for new line)"
              disabled={isWaitingForResponse}
              className="flex-1 min-h-[50px] md:min-h-[60px] resize-none text-sm md:text-base bg-black/50 border border-white/10 text-gray-100 placeholder:text-gray-600 focus-visible:ring-0 focus-visible:border-white/30 rounded-lg p-3 md:p-4"
              style={{
                caretColor: game.primaryColor || '#8b5cf6',
              }}
            />
            <Button
              onClick={() => sendMessage(userInput)}
              disabled={!userInput.trim() || isWaitingForResponse}
              className="self-end h-[50px] md:h-[60px] px-6 rounded-lg font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-current"
              style={{
                backgroundColor: game.primaryColor || '#8b5cf6',
                color: 'white',
              }}
            >
              {isWaitingForResponse ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 md:hidden" />
                  <span className="hidden md:inline flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Make Choice
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}