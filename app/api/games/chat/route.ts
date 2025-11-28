import { NextRequest, NextResponse } from 'next/server'
import { GameAIService } from '@/domains/games/services/game-ai.service'
import { prisma } from '@/lib/database'
import { z } from 'zod'

const chatSchema = z.object({
  sessionId: z.string().uuid(),
  gameId: z.string(),
  message: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, gameId, message } = chatSchema.parse(body)
    
    // Get session and game with article context
    const session = await prisma.session.findFirst({
      where: { sessionId }
    })
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }
    
    // Fetch game to get article context for thematic continuity
    const game = await prisma.game.findFirst({
      where: { id: gameId }
    })
    
    const articleContext = game?.articleContext || undefined
    
    // Save user message
    const userMessage = await prisma.chat.create({
      data: {
        sessionId: session.id,
        gameId,
        userId: session.userId,
        role: 'user',
        content: message,
        model: 'user-input',
      }
    })
    
    // Get conversation history
    const chatHistory = await prisma.chat.findMany({
      where: {
        sessionId: session.id,
        gameId,
      },
      orderBy: { createdAt: 'asc' },
      take: 20, // Limit context to last 20 messages
    })
    
    // Convert to AI format
    const messages = chatHistory
      .filter(chat => chat.role !== 'system')
      .map(chat => ({
        role: chat.role as 'user' | 'assistant',
        content: chat.content,
      }))
    
    // Calculate current panel number (assistant messages = panels)
    const assistantMessageCount = chatHistory.filter(m => m.role === 'assistant').length
    const currentPanelNumber = assistantMessageCount + 1
    const maxPanels = 5 // Match MAX_COMIC_PANELS from frontend
    
    // CRITICAL: Prevent generation beyond max panels
    if (assistantMessageCount >= maxPanels) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Story is complete! View your finished comic.',
          gameComplete: true 
        },
        { status: 400 }
      )
    }
    
    // Start streaming response
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Get AI response with panel awareness and article thematic continuity
           const chatStream = GameAIService.chatGame(
             messages,
             message,
             game?.promptModel || 'gpt-4o-mini', // Use model from game generation for consistency
             currentPanelNumber,
             maxPanels,
             articleContext
           )
          
          let assistantContent = ''
          
          for await (const response of chatStream) {
            const data = `data: ${JSON.stringify(response)}\n\n`
            controller.enqueue(encoder.encode(data))
            
            // Accumulate content for final save
            if (response.type === 'content') {
              assistantContent += response.content
            }
            
            // Save assistant response when done
            if (response.type === 'end') {
              await prisma.chat.create({
                data: {
                  parentId: userMessage.id,
                  sessionId: session.id,
                  gameId,
                  userId: session.userId,
                  role: 'assistant',
                  content: assistantContent,
                  model: 'gpt-4o-mini',
                }
              })
            }
          }
          
          controller.close()
        } catch (error) {
          console.error('Chat streaming error:', error)
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            error: 'Failed to process message'
          })}\n\n`
          controller.enqueue(encoder.encode(errorData))
          controller.close()
        }
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
    
  } catch (error) {
    console.error('Chat error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to process chat' },
      { status: 500 }
    )
  }
}