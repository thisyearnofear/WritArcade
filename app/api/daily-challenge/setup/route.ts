import { NextRequest, NextResponse } from 'next/server'
import { config, logger } from '@/lib/config'
import {
  ensureDailyDeckShuffled,
  ensureTodaysFeaturedArticle,
  getBasePaintDay,
} from '@/lib/daily-challenge'

export const maxDuration = 60

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

async function runDailySetup(day: number) {
  const shuffle = await ensureDailyDeckShuffled(day)
  const featured = await ensureTodaysFeaturedArticle({ day })

  logger.info('Daily challenge setup complete', {
    day,
    shuffleAlready: shuffle.alreadyShuffled,
    featuredStatus: featured.status,
    featuredReason: featured.reason,
    publicationSlug: featured.publicationSlug,
  })

  return {
    day,
    shuffle,
    featured: {
      status: featured.status,
      reason: featured.reason,
      publicationSlug: featured.publicationSlug,
      sourceType: featured.source?.sourceType,
      sourceUrl: featured.source?.sourceUrl,
      theme: featured.source?.theme,
      articleTitle: featured.source?.articleTitle,
    },
  }
}

/**
 * GET /api/daily-challenge/setup
 *
 * Vercel Cron entry point (see vercel.json). Requires CRON_SECRET bearer token.
 * Shuffles the Inco deck (if needed) and auto-picks today's featured Paragraph article.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (!config.features.dailyChallenge) {
      return NextResponse.json({ error: 'Daily challenge feature is not enabled' }, { status: 400 })
    }

    const result = await runDailySetup(getBasePaintDay())
    return NextResponse.json(result)
  } catch (error) {
    console.error('Daily challenge cron setup failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set up daily challenge' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/daily-challenge/setup
 *
 * Manual ops trigger (requires CRON_SECRET).
 * Body: { day?, forceFeatured? } — forceFeatured re-runs Paragraph auto-pick even if dual exists.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (!config.features.dailyChallenge) {
      return NextResponse.json({ error: 'Daily challenge feature is not enabled' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const day = typeof body.day === 'number' ? body.day : getBasePaintDay()
    const forceFeatured = body.forceFeatured === true

    const shuffle = await ensureDailyDeckShuffled(day)
    const featured = await ensureTodaysFeaturedArticle({ day, force: forceFeatured })

    return NextResponse.json({
      day,
      shuffle,
      featured: {
        status: featured.status,
        reason: featured.reason,
        publicationSlug: featured.publicationSlug,
        sourceType: featured.source?.sourceType,
        sourceUrl: featured.source?.sourceUrl,
        theme: featured.source?.theme,
        articleTitle: featured.source?.articleTitle,
      },
    })
  } catch (error) {
    console.error('Daily challenge setup failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set up daily challenge' },
      { status: 500 }
    )
  }
}
