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
  customization: z.object({
    genre: z.enum(['horror', 'comedy', 'mystery']).optional(),
    difficulty: z.enum(['easy', 'hard']).optional(),
  }).optional(),
  payment: z.object({
    writerCoinId: z.string().optional(),
  }).optional(),
  model: z.string().optional(),
  promptName: z.string().optional(),
  private: z.boolean().optional(),
}).refine(
  (data) => data.promptText || data.url,
  "Either promptText or url must be provided"
)

export async function POST(request: NextRequest) {
  try {
    console.log('Game generation request received')
    
    // Check environment variables
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      console.error('No AI API keys configured')
      return NextResponse.json(
        { success: false, error: 'AI service not configured' },
        { status: 503 }
      )
    }
    
    const body = await request.json()
    console.log('Request body received:', { hasUrl: !!body.url, hasPromptText: !!body.promptText })
    
    // Get current user (optional)
    const user = await optionalAuth()
    console.log('User auth result:', { userId: user?.id, userWallet: user?.walletAddress })
    
    // Validate request
    const validatedData = generateGameSchema.parse(body)
    
    let processedPrompt = validatedData.promptText || ''
    let processedContent
    
    // If URL provided, extract and process content
    if (validatedData.url && ContentProcessorService.isValidUrl(validatedData.url)) {
      try {
        processedContent = await ContentProcessorService.processUrl(validatedData.url)
        
        // Extract article themes for thematic game design
        const articleThemes = ContentProcessorService.extractArticleThemes(
          processedContent.text,
          processedContent.title
        )
        
        processedPrompt = `Create a game based on this article: "${processedContent.title || 'Untitled'}"

ARTICLE SOURCE MATERIAL:
Author: ${processedContent.author || 'Unknown'} | Publication: ${processedContent.publicationName || 'Unknown'} | ${processedContent.wordCount} words

THEMATIC ESSENCE (use to inspire authentic game mechanics):
${articleThemes}

FULL ARTICLE TEXT (preserve the original author's voice and ideas):
${processedContent.text}

DESIGN IMPERATIVE:
Your game MUST authentically interpret this article's core themes. Players should play this game and think differently about the concepts ${processedContent.author || 'the author'} presents. This game is a derivative work that honors the original author's ideas while offering a unique, interactive interpretation.`
      } catch (error) {
        console.error('Content processing failed:', error)
        // Re-throw with better message
        const message = error instanceof Error ? error.message : 'Failed to process URL'
        throw new Error(`URL processing failed: ${message}`)
      }
    }
    
    // Build game generation request with optional customization
    const gameRequest = {
      promptText: processedPrompt,
      url: validatedData.url,
      customization: validatedData.customization,
      model: validatedData.model,
      promptName: validatedData.promptName,
      private: validatedData.private,
      payment: validatedData.payment,
    }

    // Generate game using consolidated AI service
    const gameData = await GameAIService.generateGame(gameRequest)
    
    // Save to database using enhanced database service  
    const miniAppData = processedContent ? {
      articleUrl: validatedData.url,
      difficulty: validatedData.customization?.difficulty,
      writerCoinId: validatedData.payment?.writerCoinId,
      authorWallet: processedContent.authorWallet,
      authorParagraphUsername: processedContent.author, // Extract from URL parsing
      publicationName: processedContent.publicationName,
      publicationSummary: processedContent.publicationSummary,
      subscriberCount: processedContent.subscriberCount,
      articlePublishedAt: processedContent.publishedAt,
      // Include comprehensive article context for authentic game narrative continuity
      articleContext: `Article: "${processedContent.title}"\nAuthor: ${processedContent.author || 'Unknown'}\nPublication: ${processedContent.publicationName || 'Unknown'}\n\nCore Themes:\n${ContentProcessorService.extractArticleThemes(processedContent.text, processedContent.title)}\n\nKey excerpt:\n${processedContent.text.substring(0, 800)}...`,
    } : undefined
    
    // Enhance game data with attribution
    const enhancedGameData = {
      ...gameData,
      creatorWallet: user?.walletAddress,
      authorWallet: processedContent?.authorWallet,
      authorParagraphUsername: processedContent?.author,
      articleUrl: validatedData.url,
      difficulty: validatedData.customization?.difficulty
    }
    
    const savedGame = await GameDatabaseService.createGame(enhancedGameData, user?.id, miniAppData)
    
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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    })
    
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