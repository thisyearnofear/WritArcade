import { NextRequest, NextResponse } from 'next/server'
import { GameAIService } from '@/domains/games/services/game-ai.service'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { ContentProcessorService } from '@/domains/content/services/content-processor.service'
import { optionalAuth } from '@/lib/auth'
import { z } from 'zod'

// Request validation schema
const generateGameSchema = z.object({
  promptText: z.string().optional(),
  url: z.string().url().optional(),
  model: z.string().optional(),
  promptName: z.string().optional(),
  private: z.boolean().optional(),
}).refine(
  (data) => data.promptText || data.url,
  "Either promptText or url must be provided"
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Get current user (optional)
    const user = await optionalAuth()
    
    // Validate request
    const validatedData = generateGameSchema.parse(body)
    
    let processedPrompt = validatedData.promptText || ''
    
    // If URL provided, extract and process content
    if (validatedData.url && ContentProcessorService.isValidUrl(validatedData.url)) {
      try {
        const processedContent = await ContentProcessorService.processUrl(validatedData.url)
        
        processedPrompt = `Create a game based on this article: "${processedContent.title || 'Untitled'}"
        
Content summary (${processedContent.wordCount} words, ~${processedContent.estimatedReadTime}min read):
${processedContent.text}

Make the game capture the essence and themes of this article while being engaging and interactive.`

      } catch (error) {
        console.error('Content processing failed:', error)
        // Fallback to basic URL-based generation
        processedPrompt = `Generate a game based on content from: ${validatedData.url}`
      }
    }
    
    // Generate game using consolidated AI service
    const gameData = await GameAIService.generateGame({
      promptText: processedPrompt,
      url: validatedData.url,
      model: validatedData.model,
      promptName: validatedData.promptName,
      private: validatedData.private,
    })
    
    // Save to database using enhanced database service
    const savedGame = await GameDatabaseService.createGame(gameData, user?.id)
    
    return NextResponse.json({
      success: true,
      data: {
        ...gameData,
        id: savedGame.id,
        slug: savedGame.slug,
        createdAt: savedGame.createdAt,
      },
    })
    
  } catch (error) {
    console.error('Game generation error:', error)
    
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
      { 
        success: false, 
        error: 'Failed to generate game. Please try again.' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Get recent games for homepage
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '25')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || undefined
    const genre = searchParams.get('genre') || undefined
    
    // Fetch games from database
    const result = await GameDatabaseService.getGames({
      limit,
      offset,
      search,
      genre,
      includePrivate: false, // Public API endpoint
    })
    
    return NextResponse.json({
      success: true,
      data: result,
    })
    
  } catch (error) {
    console.error('Get games error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}