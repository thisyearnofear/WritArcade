'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Play, Send } from 'lucide-react'
import { Game, ChatMessage, GameplayOption } from '../types'

interface GamePlayInterfaceProps {
  game: Game
}

interface ChatEntry extends ChatMessage {
  options?: GameplayOption[]
}

export function GamePlayInterface({ game }: GamePlayInterfaceProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [isStarting, setIsStarting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
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

  const handleOptionClick = (option: GameplayOption) => {
    sendMessage(option.text)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(userInput)
    }
  }

  if (!isPlaying) {
    return (
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="relative h-[60vh] overflow-hidden">
          {game.imageUrl && (
            <>
              <img 
                src={game.imageUrl} 
                alt={game.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black"></div>
            </>
          )}
          
          <div className="relative h-full flex items-center justify-center px-4">
            <div className="max-w-3xl text-center space-y-6">
              <div className="inline-block px-4 py-2 rounded-full border text-sm font-semibold"
                style={{
                  borderColor: game.primaryColor || '#8b5cf6',
                  color: game.primaryColor || '#8b5cf6',
                  backgroundColor: `${game.primaryColor || '#8b5cf6'}20`,
                }}
              >
                {game.genre} • {game.subgenre}
              </div>
              
              <h1 className="text-6xl font-bold" style={{ color: game.primaryColor || '#8b5cf6' }}>
                {game.title}
              </h1>
              
              <blockquote className="text-2xl italic opacity-90" style={{ color: game.primaryColor || '#8b5cf6' }}>
                "{game.tagline}"
              </blockquote>
              
              <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                {game.description}
              </p>
              
              <Button
                onClick={startGame}
                disabled={isStarting}
                size="lg"
                className="mt-8 text-lg px-8 py-6"
                style={{ backgroundColor: game.primaryColor || '#8b5cf6' }}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 mr-2" />
                    Start Game
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
      style={{ 
        background: `radial-gradient(circle at 50% 50%, ${game.primaryColor || '#8b5cf6'}15, black)` 
      }}
    >
      <div className="w-full max-w-4xl relative group">
        <div
          className="absolute -inset-1 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"
          style={{ background: `linear-gradient(135deg, ${game.primaryColor || '#8b5cf6'}, transparent, ${game.primaryColor || '#8b5cf6'})` }}
        ></div>
        <div className="relative bg-black/80 backdrop-blur-xl rounded-lg border border-white/10 min-h-[70vh] flex flex-col shadow-2xl">
          <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[60vh]">
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : ''}>
                <div className={`max-w-[85%] ${message.role === 'user'
                  ? 'bg-blue-600/10 border-l-2 border-blue-500'
                  : 'bg-white/5 border-l-2'
                  } p-4 rounded-r-lg rounded-bl-lg shadow-lg`}
                  style={message.role === 'assistant' ? { borderColor: game.primaryColor || '#8b5cf6' } : {}}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-100">
                    {message.content}
                  </div>

                  {message.options && message.options.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.options.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => handleOptionClick(option)}
                          disabled={isWaitingForResponse}
                          className="w-full text-left text-sm p-3 bg-black/40 hover:bg-white/10 rounded border transition-all duration-200 disabled:opacity-50"
                          style={{ borderColor: `${game.primaryColor || '#8b5cf6'}40` }}
                        >
                          <span className="font-medium" style={{ color: game.primaryColor || '#8b5cf6' }}>
                            {option.id}.
                          </span>{' '}
                          <span className="text-gray-200">{option.text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isWaitingForResponse && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-white/10 p-4 bg-black/60 backdrop-blur-md rounded-b-lg">
            <div className="flex gap-2">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="What do you do?"
                disabled={isWaitingForResponse}
                className="flex-1 min-h-[50px] resize-none text-sm bg-black/50 border-white/10 text-gray-100 placeholder:text-gray-500"
                style={{
                  caretColor: game.primaryColor || '#8b5cf6',
                }}
              />
              <Button
                onClick={() => sendMessage(userInput)}
                disabled={!userInput.trim() || isWaitingForResponse}
                className="self-end"
                style={{ backgroundColor: game.primaryColor || '#8b5cf6' }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}