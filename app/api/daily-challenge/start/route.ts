import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { config, logger } from '@/lib/config'
import {
  getBasePaintDay,
  getBasePaintDailySource,
  getTodaysDailySource,
  ensureTodaysFeaturedArticle,
  getVaultAddress,
  ensureDailyDeckShuffled,
  isDailyDeckShuffled,
  type DailyChallengeSource,
} from '@/lib/daily-challenge'

export const maxDuration = 60

/**
 * POST /api/daily-challenge/start
 *
 * Starts a daily challenge game session.
 *
 * 1. Resolves today's challenge source (article, marketing copy, or BasePaint)
 * 2. Creates a game via the existing game generation flow (simplified)
 * 3. Calls DailyChallengeVault.startSession() on-chain to deal 5 encrypted modifiers
 * 4. Returns the sessionId + modifier handles for client-side decryption
 *
 * The frontend then plays the game normally — after each panel, it calls
 * /api/daily-challenge/[id]/record-choice to update the encrypted score.
 * At the finale, it calls /api/daily-challenge/[id]/reveal.
 */
export async function POST(request: NextRequest) {
  try {
    if (!config.features.dailyChallenge) {
      return NextResponse.json(
        { error: 'Daily challenge feature is not enabled' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { sourceType } = body as {
      sourceType?: 'dual' | 'article' | 'marketing-copy' | 'basepaint'
    }

    // Resolve today's challenge source
    const day = getBasePaintDay()

    let source: DailyChallengeSource

    if (sourceType === 'dual' || sourceType === 'basepaint' || !sourceType) {
      // Default: dual (featured article + BasePaint) when configured, else BasePaint-only
      source = await getTodaysDailySource(day, { enrichArticle: true })
      if (sourceType === 'basepaint' && source.sourceType === 'dual') {
        // Explicit BasePaint-only override
        source = await getBasePaintDailySource(day)
      }
    } else if (sourceType === 'article') {
      const articleUrl = body.articleUrl
      if (!articleUrl) {
        return NextResponse.json({ error: 'articleUrl required for article source' }, { status: 400 })
      }
      source = {
        day,
        sourceType: 'article',
        sourceUrl: articleUrl,
        theme: body.theme || 'Daily Article Challenge',
        promptText: body.promptText,
      }
    } else {
      // marketing-copy
      source = {
        day,
        sourceType: 'marketing-copy',
        theme: body.theme || 'Daily Copy Challenge',
        promptText: body.promptText || body.marketingCopy,
      }
    }

    // Upsert the daily challenge in the DB
    const challenge = await prisma.dailyChallenge.upsert({
      where: { day: source.day },
      create: {
        day: source.day,
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl || null,
        basePaintDay: source.basePaintDay || null,
        theme: source.theme,
        articleTitle: source.articleTitle || null,
        articleAuthor: source.articleAuthor || null,
        palette: source.palette || [],
        canvasUrl: source.canvasUrl || null,
        active: true,
      },
      update:
        source.sourceType === 'dual'
          ? {
              // Allow upgrading today's row from BasePaint-only → dual
              sourceType: source.sourceType,
              sourceUrl: source.sourceUrl || null,
              basePaintDay: source.basePaintDay || null,
              theme: source.theme,
              articleTitle: source.articleTitle || null,
              articleAuthor: source.articleAuthor || null,
              palette: source.palette || [],
              canvasUrl: source.canvasUrl || null,
            }
          : {},
    })

    // Ensure today's deck is shuffled before the client starts a session
    let deckShuffled = false
    let deckSetupError: string | null = null

    try {
      const shuffleResult = await ensureDailyDeckShuffled(source.day)
      deckShuffled = true
      if (!shuffleResult.alreadyShuffled) {
        logger.info('Daily challenge deck shuffled during session start', {
          day: source.day,
          txHash: shuffleResult.txHash,
        })
      }
    } catch (err) {
      deckSetupError = err instanceof Error ? err.message : 'Failed to shuffle daily deck'
      logger.error('Daily challenge deck shuffle failed during session start', err, { day: source.day })
      try {
        deckShuffled = await isDailyDeckShuffled(source.day)
      } catch {
        deckShuffled = false
      }
    }

    const vaultAddress = getVaultAddress()
    const onChainSessionId: string | null = null
    const modifierHandles: string[] = []
    const needsClientStartSession = deckShuffled

    return NextResponse.json({
      success: true,
      challenge: {
        id: challenge.id,
        day: challenge.day,
        sourceType: challenge.sourceType,
        sourceUrl: challenge.sourceUrl,
        theme: challenge.theme,
        articleTitle: source.articleTitle,
        articleAuthor: source.articleAuthor,
        palette: challenge.palette,
        canvasUrl: challenge.canvasUrl,
        promptText: source.promptText,
      },
      onChain: {
        vaultAddress,
        day: source.day,
        sessionId: onChainSessionId,
        modifierHandles,
        deckShuffled,
        deckSetupError,
        needsDeckSetup: !deckShuffled,
        needsClientStartSession,
        startSession: needsClientStartSession
          ? {
              functionName: 'startSession',
              args: [source.day],
              payable: true,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Daily challenge start failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start daily challenge' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/daily-challenge/start
 *
 * Returns today's challenge info without starting a session.
 */
export async function GET() {
  try {
    if (!config.features.dailyChallenge) {
      return NextResponse.json(
        { error: 'Daily challenge feature is not enabled' },
        { status: 400 }
      )
    }

    const day = getBasePaintDay()
    // Lazy auto-pick if cron hasn't curated today's dual source yet
    try {
      await ensureTodaysFeaturedArticle({ day })
    } catch (err) {
      logger.error('Lazy featured article pick failed on page load', err, { day })
    }
    // Fast path: skip article fetch on page load; generate/start enrich fully.
    const source = await getTodaysDailySource(day, { enrichArticle: false })

    let deckShuffled = false
    let deckSetupError: string | null = null

    try {
      const shuffleResult = await ensureDailyDeckShuffled(day)
      deckShuffled = true
      if (!shuffleResult.alreadyShuffled) {
        logger.info('Daily challenge deck shuffled on page load', {
          day,
          txHash: shuffleResult.txHash,
        })
      }
    } catch (err) {
      deckSetupError = err instanceof Error ? err.message : 'Failed to shuffle daily deck'
      logger.error('Daily challenge deck shuffle failed on page load', err, { day })
      try {
        deckShuffled = await isDailyDeckShuffled(day)
      } catch {
        deckShuffled = false
      }
    }

    // Check DB for existing challenge
    const existing = await prisma.dailyChallenge.findUnique({
      where: { day },
    })

    // Get leaderboard preview
    const leaderboard = await prisma.dailyChallengeSession.findMany({
      where: {
        challenge: { day },
        revealed: true,
      },
      orderBy: { score: 'desc' },
      take: 10,
      include: {
        game: { select: { title: true, slug: true } },
      },
    })

    const challengePayload = {
      day: existing?.day ?? source.day,
      sourceType: source.sourceType,
      sourceUrl:
        ('sourceUrl' in source ? source.sourceUrl : undefined) ||
        existing?.sourceUrl ||
        undefined,
      theme: source.theme,
      articleTitle:
        ('articleTitle' in source ? source.articleTitle : undefined) ||
        existing?.articleTitle ||
        undefined,
      articleAuthor:
        ('articleAuthor' in source ? source.articleAuthor : undefined) ||
        existing?.articleAuthor ||
        undefined,
      canvasTheme:
        'canvasTheme' in source ? source.canvasTheme : undefined,
      palette: source.palette?.length ? source.palette : existing?.palette,
      canvasUrl: source.canvasUrl || existing?.canvasUrl || undefined,
      promptText: source.promptText,
      id: existing?.id,
    }

    return NextResponse.json({
      challenge: challengePayload,
      source,
      deckShuffled,
      deckSetupError,
      leaderboard: leaderboard.map((entry) => ({
        playerAddress: entry.playerAddress,
        score: entry.score,
        gameTitle: entry.game?.title,
        gameSlug: entry.game?.slug,
      })),
    })
  } catch (error) {
    console.error('Daily challenge info failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily challenge' },
      { status: 500 }
    )
  }
}
