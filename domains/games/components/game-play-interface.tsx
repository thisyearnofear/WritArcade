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
      // Create a new session
      const sessionResponse = await fetch('/api/session/new')
      const sessionData = await sessionResponse.json()
      
      if (!sessionData.success) {
        throw new Error('Failed to create session')
      }
      
      const newSessionId = sessionData.data.sessionId
      setSessionId(newSessionId)
      
      // Start the game
      const startResponse = await fetch(`/api/games/${game.slug}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: newSessionId }),
      })
      
      if (!startResponse.ok) {
        throw new Error('Failed to start game')
      }
      
      // Handle streaming response
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
                // Update the current message in real-time
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
                // Finalize the message with options
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
      alert('Failed to start game. Please try again.')
    } finally {
      setIsStarting(false)
    }
  }
  
  const sendMessage = async (message: string) => {
    if (!sessionId || !message.trim()) return
    
    setIsWaitingForResponse(true)
    setUserInput('')
    
    // Add user message
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
      
      // Handle streaming response similar to startGame
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
      alert('Failed to send message. Please try again.')
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
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Ready to Play?</h2>
          <p className="text-gray-400 mb-8">
            Start your interactive adventure in {game.title}. 
            Make choices, explore the story, and see where your decisions lead.
          </p>
          
          <Button
            onClick={startGame}
            disabled={isStarting}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Starting Game...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Start Game
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Chat Messages */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-700 min-h-[600px] flex flex-col">
        <div className="flex-1 p-6 overflow-y-auto">
          {messages.map((message) => (
            <div key={message.id} className={`mb-6 ${message.role === 'user' ? 'ml-8' : 'mr-8'}`}>
              <div className={`p-4 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-600/20 border-l-4 border-blue-500' 
                  : 'bg-gray-800/50 border-l-4 border-purple-500'
              }`}>
                <div className="text-xs text-gray-500 mb-2 capitalize">
                  {message.role}
                </div>
                <div className="prose prose-invert max-w-none">
                  {message.content}
                </div>
                
                {/* Options */}
                {message.options && message.options.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {message.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleOptionClick(option)}
                        disabled={isWaitingForResponse}
                        className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded border border-gray-600 hover:border-purple-500 transition-colors disabled:opacity-50"
                      >
                        <span className="font-medium text-purple-300">{option.id}.</span>{' '}
                        {option.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isWaitingForResponse && (
            <div className="mr-8 mb-6">
              <div className="p-4 rounded-lg bg-gray-800/50 border-l-4 border-purple-500">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-gray-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex space-x-2">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response or action..."
              disabled={isWaitingForResponse}
              className="flex-1 min-h-[60px] resize-none"
            />
            <Button
              onClick={() => sendMessage(userInput)}
              disabled={!userInput.trim() || isWaitingForResponse}
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Press Enter to send • Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  )
}