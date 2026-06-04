import { NextRequest, NextResponse, after } from 'next/server'
import { GameAIService } from '@/domains/games/services/game-ai.service'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { ImageGenerationService } from '@/domains/games/services/image-generation.service'
import { ContentProcessorService } from '@/domains/content/services/content-processor.service'
import { WordleService } from '@/domains/games/services/wordle.service'
import { vaultWordleAnswer } from '@/domains/story/services/cdr.service'
import type { GameGenerationResponse } from '@/domains/games/types'
import { optionalAuth } from '@/lib/auth'
import { z } from 'zod'
import { UserAIPreferenceService } from '@/lib/user-ai-preferences.service'
import { config, logger } from '@/lib/config'
import { prisma } from '@/lib/prisma'
import { getMintConfig } from '@/lib/writerCoins'
import { GameFundingService } from '@/domains/payments/services/game-funding.service'

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
    paymentId: z.string().optional(),
    writerCoinId: z.string().optional(),
    transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  }).optional(),
  model: z.string().optional(),
  promptName: z.string().optional(),
  private: z.boolean().optional(),
  assetIds: z.array(z.string()).optional(), // New: Link to parent assets
  // Connected wallet at generate time. Becomes the canonical creatorWallet so
  // that the same wallet can mint later (SIWE login is optional and not all
  // users log in before generating).
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
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
    let processedContent: import('@/domains/content/services/content-processor.service').ProcessedContent | undefined

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

    if (mode === 'wordle') {
      if (!processedContent) {
        throw new Error('Failed to process article content for Wordle mode')
      }

      // Enhanced: Use user-specific seed for randomness to avoid predictability
      // Combine article URL and current date for varied but reproducible results
      const randomSeed = validatedData.url ? `${validatedData.url}-${new Date().toISOString().split('T')[0]}` : new Date().toISOString()
      const answer = WordleService.deriveAnswerFromText(processedContent.text, undefined, randomSeed)

      // CDR: Vault the wordle answer (never stored in plaintext)
      const wordleAnswerVaultUuid = await vaultWordleAnswer(answer)

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
        wordleAnswerVaultUuid,
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

    const fundingLookup = validatedData.payment?.paymentId
      ? { paymentId: validatedData.payment.paymentId } as const
      : validatedData.payment?.transactionHash
        ? { transactionHash: validatedData.payment.transactionHash } as const
        : null

    // Enforce payment for story mode — prevents unfunded games from being created
    if (mode === 'story' && !fundingLookup) {
      return NextResponse.json(
        {
          success: false,
          error: 'Story mode requires payment. Complete payment before generating.',
          code: 'PAYMENT_REQUIRED',
        },
        { status: 402 }
      )
    }

    const fundingContext = fundingLookup
      ? await GameFundingService.getVerifiedCreationPayment(fundingLookup)
      : null

    if (fundingLookup && !fundingContext) {
      return NextResponse.json(
        { success: false, error: 'Verified generation payment not found.', code: 'PAYMENT_NOT_VERIFIED' },
        { status: 400 }
      )
    }

    if (
      fundingContext &&
      validatedData.payment?.writerCoinId &&
      fundingContext.writerCoinId !== validatedData.payment.writerCoinId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment coin mismatch: verified payment used ${fundingContext.writerCoinId}, not ${validatedData.payment.writerCoinId}.`,
          code: 'PAYMENT_COIN_MISMATCH',
        },
        { status: 400 }
      )
    }

    // Idempotency: if a game already exists for this payment, return it
    if (fundingContext?.paymentId) {
      const existingGame = await prisma.game.findFirst({
        where: { paymentId: fundingContext.paymentId },
        select: { id: true, slug: true, title: true, description: true, imageUrl: true },
      })
      if (existingGame) {
        console.log('[Generate] Idempotency hit — returning existing game for payment:', fundingContext.paymentId)
        return NextResponse.json({
          success: true,
          data: existingGame,
          idempotent: true,
        })
      }
    }

    const ownership = GameFundingService.buildOwnership(fundingContext, {
      siweWallet: user?.walletAddress,
      connectedWallet: validatedData.wallet,
    })
    const canonicalWriterCoinId = fundingContext?.writerCoinId || validatedData.payment?.writerCoinId

    // Save to database using enhanced database service
    const miniAppData = processedContent ? {
      articleUrl: validatedData.url,
      difficulty: validatedData.customization?.difficulty,
      writerCoinId: canonicalWriterCoinId,
      wordleAnswerVaultUuid: gameData.wordleAnswerVaultUuid,
      authorWallet: processedContent.authorWallet,
      authorParagraphUsername: processedContent.author, // Extract from URL parsing
      publicationName: processedContent.publicationName,
      publicationSummary: processedContent.publicationSummary,
      subscriberCount: normalizeSubscriberCount(processedContent.subscriberCount),
      articlePublishedAt: normalizePublishedAt(processedContent.publishedAt),
      ownerWallet: ownership.ownerWallet,
      ownershipSource: ownership.ownershipSource,
      paymentId: ownership.paymentId,
      // Include comprehensive article context for authentic game narrative continuity
      articleContext: `Article: "${processedContent.title}"\nAuthor: ${processedContent.author || 'Unknown'}\nPublication: ${processedContent.publicationName || 'Unknown'}\n\nCore Themes:\n${ContentProcessorService.extractArticleThemes(processedContent.text, processedContent.title)}\n\nKey excerpt:\n${processedContent.text.substring(0, 800)}...`,
    } : undefined

    // Enhance game data with attribution
    const enhancedGameData = {
      ...gameData,
      ...ownership,
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
        const fundingOnlyData = miniAppData
          ? {
              writerCoinId: miniAppData.writerCoinId,
              paymentId: miniAppData.paymentId,
              ownerWallet: miniAppData.ownerWallet,
              ownershipSource: miniAppData.ownershipSource,
              difficulty: miniAppData.difficulty,
              wordleAnswerVaultUuid: miniAppData.wordleAnswerVaultUuid,
            }
          : undefined
        savedGame = await GameDatabaseService.createGame(enhancedGameData, user?.id, fundingOnlyData, validatedData.assetIds)
      } catch (fallbackDbError) {
        const fallbackMessage = fallbackDbError instanceof Error ? fallbackDbError.message : 'Unknown DB save error'
        throw new Error(`DB_SAVE_FAILED: ${fallbackMessage}`)
      }
    }
    console.log('Game saved successfully:', { id: savedGame.id, slug: savedGame.slug })

    // Generate cover image eagerly (non-blocking — saves to DB when ready)
    const coverImagePromise = savedGame.mode !== 'wordle'
      ? ImageGenerationService.generateGameImage(savedGame).then(async (result) => {
          if (result.imageUrl) {
            await GameDatabaseService.updateGameImage(savedGame.id, result.imageUrl)
            return result.imageUrl
          }
          return null
        }).catch((err) => {
          console.error('Cover image generation failed:', err)
          return null
        })
      : Promise.resolve(null)

    // after() keeps the serverless function alive until enrichment completes,
    // even after the response is sent. This prevents Vercel from killing the
    // function mid-enrichment (which caused silent secret-panel vaulting failures).
    after(async () => {
      try {
        await enrichGameInBackground(
          savedGame.id, savedGame.slug, gameData,
          processedContent?.text, canonicalWriterCoinId
        )
      } catch (err) {
        logger.error('Background enrichment failed', err, { gameId: savedGame.id })
      }
    })

    const coverImageUrl = await coverImagePromise

    return NextResponse.json({
      success: true,
      data: {
        ...gameData,
        id: savedGame.id,
        slug: savedGame.slug,
        createdAt: savedGame.createdAt,
        authorParagraphUsername: savedGame.authorParagraphUsername,
        authorWallet: savedGame.authorWallet,
        creatorWallet: savedGame.creatorWallet,
        ownerWallet: savedGame.ownerWallet,
        ownershipSource: savedGame.ownershipSource,
        paymentId: savedGame.paymentId,
        writerCoinId: savedGame.writerCoinId,
        imageUrl: coverImageUrl,
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
    const lowerMessage = message.toLowerCase()
    const errorCode = message.startsWith('URL processing failed:')
      ? 'CONTENT_PROCESSING_FAILED'
      : message.startsWith('AI generation failed')
        ? (lowerMessage.includes('insufficient_quota') || lowerMessage.includes('quota') || lowerMessage.includes('429')
          ? 'AI_QUOTA_EXCEEDED'
          : 'AI_GENERATION_FAILED')
        : message.startsWith('DB_SAVE_FAILED:') || message.includes('Failed to save game to database')
          ? 'DB_SAVE_FAILED'
          : 'GAME_GENERATION_FAILED'

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate game. Please try again.',
        code: errorCode,
      },
      { status: 500 }
    )
  }
}

// GET /api/games/generate is POST-only.
// Game listing lives at GET /api/games (app/api/games/route.ts) with caching.
// Keeping this comment so future contributors don't re-add the duplicate.

/**
 * Background enrichment: generate secret panel + hypercert after game creation.
 * Non-blocking — failures do not affect the game generation response.
 *
 * ENHANCEMENT FIRST: Wraps both integrations in a single function to avoid
 * duplicating error handling and DB update logic.
 */
async function enrichGameInBackground(
  gameId: string,
  gameSlug: string,
  gameData: GameGenerationResponse,
  articleText?: string,
  writerCoinId?: string
): Promise<void> {
  // Generate secret panel + vault with Story CDR
  try {
    const { vaultSystemPrompt } = await import('@/domains/story/services/cdr.service')
    const { GameAIService } = await import('@/domains/games/services/game-ai.service')

    const secretPanel = await GameAIService.generateSecretPanel(
      {
        title: gameData.title,
        description: gameData.description,
        genre: gameData.genre,
        tagline: gameData.tagline,
      },
      articleText?.substring(0, 800)
    )

    // Vault the secret panel data using CDR (NFT-gated via condition contract)
    const nftConfig = writerCoinId ? getMintConfig(writerCoinId) : undefined
    const promptVaultUuid = await vaultSystemPrompt(
      JSON.stringify(secretPanel),
      nftConfig?.contractAddress
    )

    // Update DB with vault UUID
    await prisma.game.update({
      where: { id: gameId },
      data: {
        promptVaultUuid,
        cdrReadConditionType: 'tokenGate',
        cdrVaultedAt: new Date(),
        secretPanelImagePrompt: secretPanel.imagePrompt,
        secretPanelGenerated: true,
      },
    })

    logger.info('Secret panel vaulted with Story CDR', {
      gameId,
      promptVaultUuid,
      readCondition: nftConfig
        ? `tokenGate(${nftConfig.contractAddress})`
        : 'tokenGate(default-game-nft)',
    })
  } catch (err) {
    logger.error('Secret panel vaulting failed', err, { gameId })
  }

  // Create hypercert impact certificate
  try {
    if (config.hypercerts.enabled) {
      const {
        createGameHypercert,
        buildGameHypercertInput,
      } = await import('@/lib/hypercerts.service')

      const hypercertInput = buildGameHypercertInput({
        gameTitle: gameData.title,
        gameDescription: gameData.description,
        genre: gameData.genre,
        articleTitle: articleText ? 'Source Article' : undefined,
      })

      const result = await createGameHypercert(hypercertInput)

      if (result) {
        await prisma.game.update({
          where: { id: gameId },
          data: {
            hypercertUri: result.uri,
            hypercertCid: result.cid,
          },
        })

        logger.hypercerts('Hypercert created and linked', {
          gameId,
          slug: gameSlug,
          uri: result.uri,
        })
      }
    }
  } catch (err) {
    logger.error('Hypercert creation failed (non-blocking)', err, {
      gameId,
    })
  }
}
