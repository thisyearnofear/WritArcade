import { NextRequest, NextResponse } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { GameAIService } from '@/domains/games/services/game-ai.service'
import { prisma } from '@/lib/database'
import { z } from 'zod'

const startGameSchema = z.object({
  sessionId: z.string().uuid(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json()
    const { sessionId } = startGameSchema.parse(body)
    
    // Get game by slug
    const game = await GameDatabaseService.getGameBySlug(params.slug)
    
    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      )
    }
    
    // Verify session exists
    const session = await prisma.session.findFirst({
      where: { sessionId }
    })
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 400 }
      )
    }
    
    // Create system message for game start
    const systemMessage = await prisma.chat.create({
      data: {
        sessionId: session.id,
        gameId: game.id,
        userId: session.userId,
        role: 'system',
        content: `Starting game: ${game.title}`,
        model: `${game.promptModel}:StartGame-v2`,
      }
    })
    
    // Start streaming response
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Start the game using AI service
          const gameStream = GameAIService.startGame(
            {
              title: game.title,
              description: game.description,
              genre: game.genre,
              subgenre: game.subgenre,
              tagline: game.tagline,
            },
            sessionId,
            game.promptModel
          )
          
          let assistantContent = ''
          
          for await (const response of gameStream) {
            const data = `data: ${JSON.stringify(response)}\n\n`
            controller.enqueue(encoder.encode(data))
            
            // Accumulate content for final save
            if (response.type === 'content') {
              assistantContent += response.content
            }
            
            // Save final assistant message when done
            if (response.type === 'end') {
              await prisma.chat.create({
                data: {
                  parentId: systemMessage.id,
                  sessionId: session.id,
                  gameId: game.id,
                  userId: session.userId,
                  role: 'assistant',
                  content: assistantContent,
                  model: game.promptModel,
                }
              })
            }
          }
          
          controller.close()
        } catch (error) {
          console.error('Game start streaming error:', error)
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            error: 'Failed to start game'
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
    console.error('Game start error:', error)
    
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
      { success: false, error: 'Failed to start game' },
      { status: 500 }
    )
  }
}