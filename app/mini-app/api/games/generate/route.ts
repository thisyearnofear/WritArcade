import { NextRequest, NextResponse } from 'next/server'
import { ContentProcessorService } from '@/domains/content/services/content-processor.service'
import { GameAIService } from '@/domains/games/services/game-ai.service'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { getWriterCoinById, validateArticleUrl } from '@/lib/writerCoins'
import { z } from 'zod'

// Validation schema for mini-app game generation
const miniAppGameGenerationSchema = z.object({
  writerCoinId: z.string().min(1, 'Writer coin ID is required'),
  articleUrl: z.string().url('Invalid article URL'),
  genre: z.enum(['horror', 'comedy', 'mystery']),
  difficulty: z.enum(['easy', 'hard']),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request
    const validatedData = miniAppGameGenerationSchema.parse(body)

    // Validate writer coin is whitelisted
    const writerCoin = getWriterCoinById(validatedData.writerCoinId)
    if (!writerCoin) {
      return NextResponse.json(
        { error: `Writer coin "${validatedData.writerCoinId}" is not whitelisted` },
        { status: 400 }
      )
    }

    // Validate article URL matches writer coin's Paragraph
    if (!validateArticleUrl(validatedData.articleUrl, validatedData.writerCoinId)) {
      return NextResponse.json(
        {
          error: `Article URL must be from ${writerCoin.paragraphUrl}. Current URL is from a different source.`,
        },
        { status: 400 }
      )
    }

    // Fetch and process article content
    let processedContent = null
    let articleTitle = 'Article'

    try {
      if (ContentProcessorService.isValidUrl(validatedData.articleUrl)) {
        processedContent = await ContentProcessorService.processUrl(validatedData.articleUrl)
        articleTitle = processedContent.title || 'Article'
      }
    } catch (error) {
      console.error('Content processing failed:', error)
      // Continue with just the URL if content processing fails
    }

    // Build the game generation prompt with genre and difficulty
    const difficultyDescriptor = validatedData.difficulty === 'easy' 
      ? 'accessible, simple choices, forgiving gameplay'
      : 'challenging, complex choices, consequences matter'

    const genreDescriptor = {
      horror: 'dark, suspenseful, with tension and fear elements',
      comedy: 'humorous, lighthearted, with absurd situations and jokes',
      mystery: 'intriguing, puzzle-like, with clues to uncover',
    }[validatedData.genre]

    const promptText = `Create a ${validatedData.genre} game with ${validatedData.difficulty} difficulty that is ${genreDescriptor}.
    
${
  processedContent
    ? `Based on this article: "${processedContent.title || 'Untitled'}"

Article metadata: From publication "${processedContent.publicationName || 'Unknown'}" with ${processedContent.subscriberCount || 0} subscribers. Author: ${processedContent.author || 'Unknown'} (wallet: ${processedContent.authorWallet || 'N/A'}). Published: ${processedContent.publishedAt?.toISOString() || 'Unknown'}.

Content summary (${processedContent.wordCount} words, ~${processedContent.estimatedReadTime || 0}min read):
${processedContent.text}`
    : `Based on the content from: ${validatedData.articleUrl}`
}

The game should:
1. Capture the theme and essence of the article
2. Be ${validatedData.difficulty === 'easy' ? 'accessible with clear paths' : 'challenging with meaningful choices'}
3. Have a ${validatedData.genre} tone and atmosphere
4. Be engaging and interactive`

    // Generate game using AI service
    const gameData = await GameAIService.generateGame({
      promptText,
      url: validatedData.articleUrl,
      model: 'gpt-4o-mini',
      promptName: `MiniApp-${validatedData.genre}-${validatedData.difficulty}`,
    })

    // Save to database with mini-app specific fields
    const savedGame = await GameDatabaseService.createGame(
      gameData,
      undefined,
      {
        articleUrl: validatedData.articleUrl,
        writerCoinId: validatedData.writerCoinId,
        difficulty: validatedData.difficulty,
      }
    )

    return NextResponse.json({
      ...gameData,
      id: savedGame.id,
      slug: savedGame.slug,
      articleUrl: savedGame.articleUrl,
      writerCoinId: savedGame.writerCoinId,
      difficulty: savedGame.difficulty,
      createdAt: savedGame.createdAt,
    })
  } catch (error) {
    console.error('Mini-app game generation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to generate game: ${errorMessage}` },
      { status: 500 }
    )
  }
}
