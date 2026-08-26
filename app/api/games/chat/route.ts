import { NextRequest, NextResponse } from 'next/server'
import { GameAIService } from '@/domains/games/services/game-ai.service'
import { prisma } from '@/lib/database'
import { z } from 'zod'
import { UserAIPreferenceService } from '@/lib/user-ai-preferences.service'
import { isFeatureEnabled } from '@/lib/config'
import type { StoryPlan } from '@/domains/games/services/story-planner.service'
import { Prisma } from '@prisma/client'

const chatSchema = z.object({
  sessionId: z.string().uuid(),
  gameId: z.string(),
  message: z.string().min(1),
  optionId: z.number().int().min(1).max(4).optional(),
  dailyChallenge: z.object({
    incoSessionId: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, gameId, message, optionId, dailyChallenge } = chatSchema.parse(body)
    
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
    const agentPlan = game?.agentPlan as StoryPlan | undefined
    
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

    // Resonance: record which framing the player chose on the panel they
    // just answered. Directional metric — non-blocking.
    if (optionId) {
      try {
        await prisma.gamePlayEvent.create({
          data: {
            gameId,
            type: 'choice',
            sessionId,
            panelIndex: assistantMessageCount,
            choiceIndex: optionId,
            choiceText: message.slice(0, 500),
          },
        })
      } catch (eventError) {
        console.error('Choice event write failed (non-blocking):', eventError)
      }
    }
    
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
          // Get user AI preferences
          const userPreferences = await UserAIPreferenceService.getUserPreferences()

          const modifierPanelIndex = assistantMessageCount
          let chatStream

          // Phase 2: agentic panel (ToolLoopAgent with tools) when enabled + plan exists.
          const agenticBeat = agentPlan?.arc?.[currentPanelNumber - 1]
          let agenticUsed = false
          if (isFeatureEnabled('agentTools') && agenticBeat) {
            try {
              const { streamAgenticPanel, generateAgenticPanelOrThrow } = await import(
                '@/domains/games/services/panel-agent.service'
              )
              const panel = await generateAgenticPanelOrThrow(
                {
                  genre: game?.genre ?? '',
                  title: game?.title ?? '',
                  articleText: articleContext,
                  modelLabel: game?.promptModel || 'gpt-4o-mini',
                },
                agenticBeat,
                message
              )
              chatStream = streamAgenticPanel(panel)
              agenticUsed = true
              // Persist tool-call telemetry (additive column; non-blocking).
              if (panel.traces.length && game?.id) {
                try {
                  const existing = ((game as { agentTraces?: unknown[] }).agentTraces as unknown[]) ?? []
                  await prisma.game.update({
                    where: { id: game.id },
                    data: { agentTraces: [...existing, ...panel.traces] as Prisma.InputJsonValue },
                  })
                } catch (traceError) {
                  console.error('agentTraces persist failed (non-blocking):', traceError)
                }
              }
            } catch (agentError) {
              console.error('Agentic panel failed, falling back to procedural:', agentError)
            }
          }

          if (!agenticUsed && dailyChallenge?.incoSessionId && process.env.FEATURE_DAILY_CHALLENGE === 'true') {
            const { getModifierPromptForPanel } = await import('@/lib/daily-challenge')
            const modifierPrompt = await getModifierPromptForPanel(
              dailyChallenge.incoSessionId,
              modifierPanelIndex
            )

            const previousPanels = messages
              .filter((m) => m.role === 'assistant')
              .map((m, i) => ({
                narrative: m.content,
                choice: chatHistory.filter((c) => c.role === 'user')[i]?.content,
              }))

            if (modifierPrompt) {
              chatStream = GameAIService.generatePanelWithModifier(
                modifierPrompt,
                modifierPanelIndex,
                message,
                previousPanels,
                userPreferences,
                agentPlan
              )
            } else {
              chatStream = GameAIService.chatGame(
                messages,
                message,
                game?.promptModel || 'gpt-4o-mini',
                currentPanelNumber,
                maxPanels,
                articleContext,
                userPreferences,
                agentPlan
              )
            }
          } else {
            chatStream = GameAIService.chatGame(
              messages,
              message,
              game?.promptModel || 'gpt-4o-mini',
              currentPanelNumber,
              maxPanels,
              articleContext,
              userPreferences,
              agentPlan
            )
          }
          
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