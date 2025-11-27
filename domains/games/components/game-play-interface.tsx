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
      <div className="text-center py-12">
        <Button
          onClick={startGame}
          disabled={isStarting}
          size="lg"
          className="bg-purple-600 hover:bg-purple-700"
          style={{ backgroundColor: game.primaryColor || '#8b5cf6' }}
        >
          {isStarting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </>
          )}
        </Button>
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900/50 rounded-lg border border-gray-700 min-h-[500px] flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : ''}>
              <div className={`max-w-[85%] ${
                message.role === 'user' 
                  ? 'bg-blue-600/20 border-l-2 border-blue-500' 
                  : 'bg-gray-800/50 border-l-2'
              } p-3 rounded`}
              style={message.role === 'assistant' ? { borderColor: game.primaryColor || '#8b5cf6' } : {}}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                
                {message.options && message.options.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleOptionClick(option)}
                        disabled={isWaitingForResponse}
                        className="w-full text-left text-sm p-2 bg-gray-700/50 hover:bg-gray-700 rounded border border-gray-600 transition-colors disabled:opacity-50"
                        style={{ 
                          borderColor: `${game.primaryColor || '#8b5cf6'}40`,
                        }}
                      >
                        <span className="font-medium" style={{ color: game.primaryColor || '#8b5cf6' }}>
                          {option.id}.
                        </span>{' '}
                        {option.text}
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
        
        <div className="border-t border-gray-700 p-3">
          <div className="flex gap-2">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="What do you do?"
              disabled={isWaitingForResponse}
              className="flex-1 min-h-[50px] resize-none text-sm"
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
  )
}