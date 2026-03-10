import { NextRequest, NextResponse } from 'next/server'
import { GameAIService } from '@/domains/games/services/game-ai.service'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { ContentProcessorService } from '@/domains/content/services/content-processor.service'
import { WordleService } from '@/domains/games/services/wordle.service'
import type { GameGenerationResponse } from '@/domains/games/types'
import { optionalAuth } from '@/lib/auth'
import { z } from 'zod'
import { UserAIPreferenceService } from '@/lib/user-ai-preferences.service'

// Request validation schema
const generateGameSchema = z.object({
  promptText: z.string().optional(),
  url: z.string().url().optional(),
  // Optional game mode: "story" (default) or "wordle" (article-derived word puzzle)
  mode: z.enum(['story', 'wordle']).optional(),
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
  assetIds: z.array(z.string()).optional(), // New: Link to parent assets
}).refine(
  (data) => data.promptText || data.url,
  "Either promptText or url must be provided"
)

export async function POST(request: NextRequest) {
  try {
    console.log('Game generation request received')

    const body = await request.json()
    console.log('Request body received:', { hasUrl: !!body.url, hasPromptText: !!body.promptText, mode: body.mode })

    // Validate request
    const validatedData = generateGameSchema.parse(body)
    const mode = validatedData.mode ?? 'story'

    // Get current user (optional)
    const user = await optionalAuth()
    console.log('User auth result:', { userId: user?.id, userWallet: user?.walletAddress })

    // Get user AI preferences
    const userPreferences = await UserAIPreferenceService.getUserPreferences()
    console.log('User AI preferences:', { geminiEnabled: userPreferences.geminiEnabled, preferGemini: userPreferences.preferGemini })

    let processedPrompt = validatedData.promptText || ''
    let processedContent

    // If URL provided, extract and process content
    if (validatedData.url && ContentProcessorService.isValidUrl(validatedData.url)) {
      try {
        processedContent = await ContentProcessorService.processUrl(validatedData.url)

        // Only generate prompt from article if promptText wasn't explicitly provided
        // This allows the Workshop to pass a custom "Compiled Asset Context" while still linking the URL for attribution
        if (!validatedData.promptText) {
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
        }
      } catch (error) {
        console.error('Content processing failed:', error)
        // Re-throw with better message
        const message = error instanceof Error ? error.message : 'Failed to process URL'
        throw new Error(`URL processing failed: ${message}`)
      }
    }

    // In Wordle mode we require a URL so we can derive the puzzle from the article
    if (mode === 'wordle' && !validatedData.url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wordle mode requires an article URL.',
        },
        { status: 400 }
      )
    }

    let gameData: GameGenerationResponse
    let wordleAnswer: string | undefined

    if (mode === 'wordle') {
      if (!processedContent) {
        throw new Error('Failed to process article content for Wordle mode')
      }

      // Enhanced: Use user-specific seed for randomness to avoid predictability
      // Combine article URL and current date for varied but reproducible results
      const randomSeed = validatedData.url ? `${validatedData.url}-${new Date().toISOString().split('T')[0]}` : new Date().toISOString()
      const answer = WordleService.deriveAnswerFromText(processedContent.text, undefined, randomSeed)
      wordleAnswer = answer

      gameData = {
        title: processedContent.title
          ? `Wordle: ${processedContent.title}`
          : 'Article Wordle',
        description:
          'A Wordle-style puzzle derived from the core language of this article. Guess the key word inspired by the source material.',
        tagline: processedContent.title
          ? `Guess a key word inspired by "${processedContent.title}"`
          : 'Guess a key word inspired by this article.',
        genre: 'Wordle',
        subgenre: 'Puzzle',
        primaryColor: '#fbbf24', // Amber, distinct from core horror/comedy/mystery palette
        promptModel: 'wordle-engine',
        promptName: 'Wordle-Article-v1',
        promptText: `Article-derived Wordle answer of length ${answer.length}.`,
        mode: 'wordle',
      }

      console.log('Wordle game generated from article:', {
        title: gameData.title,
        answerLength: answer.length,
      })
    } else {
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

      // Generate game using consolidated AI service with user preferences
      console.log('Calling GameAIService.generateGame with prompt length:', gameRequest.promptText?.length)
      const aiGameData = await GameAIService.generateGame(gameRequest, 0, userPreferences)
      console.log('AI generation successful:', { title: aiGameData.title, genre: aiGameData.genre })

      gameData = {
        ...aiGameData,
        mode: 'story' as const,
      }
    }

    // Normalize optional metadata to avoid persistence failures from malformed upstream values
    const normalizePublishedAt = (value: unknown): Date | undefined => {
      if (!value) return undefined
      if (value instanceof Date && !Number.isNaN(value.getTime())) return value
      if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? undefined : parsed
      }
      return undefined
    }

    const normalizeSubscriberCount = (value: unknown): number | undefined => {
      if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value))
      if (typeof value === 'string') {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed))
      }
      return undefined
    }

    // Save to database using enhanced database service
    const miniAppData = processedContent ? {
      articleUrl: validatedData.url,
      difficulty: validatedData.customization?.difficulty,
      writerCoinId: validatedData.payment?.writerCoinId,
      wordleAnswer,
      authorWallet: processedContent.authorWallet,
      authorParagraphUsername: processedContent.author, // Extract from URL parsing
      publicationName: processedContent.publicationName,
      publicationSummary: processedContent.publicationSummary,
      subscriberCount: normalizeSubscriberCount(processedContent.subscriberCount),
      articlePublishedAt: normalizePublishedAt(processedContent.publishedAt),
      // Include comprehensive article context for authentic game narrative continuity
      articleContext: `Article: "${processedContent.title}"\nAuthor: ${processedContent.author || 'Unknown'}\nPublication: ${processedContent.publicationName || 'Unknown'}\n\nCore Themes:\n${ContentProcessorService.extractArticleThemes(processedContent.text, processedContent.title)}\n\nKey excerpt:\n${processedContent.text.substring(0, 800)}...`,
    } : undefined

    // Enhance game data with attribution
    const enhancedGameData = {
      ...gameData,
      creatorWallet: user?.walletAddress,
    }

    console.log('About to save game to database:', {
      title: enhancedGameData.title,
      hasUserId: !!user?.id,
      hasMiniAppData: !!miniAppData,
      creatorWallet: enhancedGameData.creatorWallet,
    })
    let savedGame
    try {
      savedGame = await GameDatabaseService.createGame(enhancedGameData, user?.id, miniAppData, validatedData.assetIds)
    } catch (dbError) {
      // Fallback: preserve core game generation even if optional article metadata is malformed
      console.warn('Primary game save failed, retrying without optional article metadata:', {
        message: dbError instanceof Error ? dbError.message : 'Unknown error',
      })
      try {
        savedGame = await GameDatabaseService.createGame(enhancedGameData, user?.id, undefined, validatedData.assetIds)
      } catch (fallbackDbError) {
        const fallbackMessage = fallbackDbError instanceof Error ? fallbackDbError.message : 'Unknown DB save error'
        throw new Error(`DB_SAVE_FAILED: ${fallbackMessage}`)
      }
    }
    console.log('Game saved successfully:', { id: savedGame.id, slug: savedGame.slug })

    return NextResponse.json({
      success: true,
      data: {
        ...gameData,
        id: savedGame.id,
        slug: savedGame.slug,
        createdAt: savedGame.createdAt,
        authorParagraphUsername: savedGame.authorParagraphUsername,
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

    const message = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = message.startsWith('URL processing failed:')
      ? 'CONTENT_PROCESSING_FAILED'
      : message.startsWith('AI generation failed')
        ? 'AI_GENERATION_FAILED'
        : message.startsWith('DB_SAVE_FAILED:') || message.includes('Failed to save game to database')
          ? 'DB_SAVE_FAILED'
          : 'GAME_GENERATION_FAILED'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate game. Please try again.',
        code: errorCode,
      },
      { status: 500 }
    )
  }
}

// GET /api/games/generate is POST-only.
// Game listing lives at GET /api/games (app/api/games/route.ts) with caching.
// Keeping this comment so future contributors don't re-add the duplicate.
