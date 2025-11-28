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
    let articleThemes = ''

    try {
      if (ContentProcessorService.isValidUrl(validatedData.articleUrl)) {
        processedContent = await ContentProcessorService.processUrl(validatedData.articleUrl)
        articleTitle = processedContent.title || 'Article'
        articleThemes = ContentProcessorService.extractArticleThemes(
          processedContent.text,
          processedContent.title
        )
      }
    } catch (error) {
      console.error('Content processing failed:', error)
      // Continue with just the URL if content processing fails
    }

    // Build the game generation prompt: ARTICLE FIRST, then genre/difficulty as flavor
    const promptText = processedContent
      ? `Create a game based on this article: "${processedContent.title || 'Untitled'}"

ARTICLE SOURCE MATERIAL:
Author: ${processedContent.author || 'Unknown'} | Publication: ${processedContent.publicationName || 'Unknown'} | ${processedContent.wordCount} words

THEMATIC ESSENCE (core to game design):
${articleThemes}

FULL ARTICLE TEXT (preserve the original author's voice and ideas):
${processedContent.text}

GENRE & DIFFICULTY FLAVOR (secondary to article themes):
- Apply a ${validatedData.genre} aesthetic and tone to the game
- Make it ${validatedData.difficulty === 'easy' ? 'accessible with straightforward choices' : 'challenging with complex choices'}

DESIGN IMPERATIVE:
Your game MUST authentically interpret this article's core themes. Players should play this game and think differently about the concepts ${processedContent.author || 'the author'} presents. The ${validatedData.genre} genre and ${validatedData.difficulty} difficulty enhance but never replace thematic authenticity.`
      : `Create a ${validatedData.genre} game with ${validatedData.difficulty} difficulty based on the content from: ${validatedData.articleUrl}

The game should be engaging and interactive with:
- A ${validatedData.genre} tone and atmosphere
- ${validatedData.difficulty === 'easy' ? 'Accessible gameplay with clear paths' : 'Challenging gameplay with meaningful consequences'}
- Thematically relevant mechanics and narrative`

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
        // Include comprehensive article context for authentic game start narrative continuity
        articleContext: processedContent 
          ? `Article: "${processedContent.title}"\nAuthor: ${processedContent.author || 'Unknown'}\nPublication: ${processedContent.publicationName || 'Unknown'}\n\nCore Themes:\n${articleThemes}\n\nKey excerpt:\n${processedContent.text.substring(0, 800)}...`
          : undefined,
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
