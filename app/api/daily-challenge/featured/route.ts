import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { config } from '@/lib/config'
import { getBasePaintDay, getTodaysDailySource } from '@/lib/daily-challenge'
import { setFeaturedDailyArticle } from '@/lib/basepaint/source'

export const maxDuration = 60

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

/**
 * GET /api/daily-challenge/featured
 *
 * Returns today's resolved Daily source (dual when curated, else BasePaint-only).
 * Public — used by banners / ops checks.
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
    const source = await getTodaysDailySource(day, { enrichArticle: false })

    return NextResponse.json({
      day,
      sourceType: source.sourceType,
      sourceUrl: 'sourceUrl' in source ? source.sourceUrl : undefined,
      theme: source.theme,
      articleTitle: 'articleTitle' in source ? source.articleTitle : undefined,
      articleAuthor: 'articleAuthor' in source ? source.articleAuthor : undefined,
      canvasTheme: 'canvasTheme' in source ? source.canvasTheme : source.theme,
      palette: source.palette,
      canvasUrl: source.canvasUrl,
    })
  } catch (error) {
    console.error('Featured daily source fetch failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch featured daily source' },
      { status: 500 }
    )
  }
}

const setFeaturedSchema = z.object({
  articleUrl: z.string().url(),
  articleTitle: z.string().max(300).optional(),
  articleAuthor: z.string().max(200).optional(),
  day: z.number().int().positive().optional(),
  enrich: z.boolean().optional(),
})

/**
 * POST /api/daily-challenge/featured
 *
 * Upsert today's featured article for dual-source Daily.
 * Auth: Bearer CRON_SECRET
 *
 * Body: { articleUrl, articleTitle?, articleAuthor?, day?, enrich? }
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (!config.features.dailyChallenge) {
      return NextResponse.json(
        { error: 'Daily challenge feature is not enabled' },
        { status: 400 }
      )
    }

    const body = setFeaturedSchema.parse(await request.json())
    const day = body.day ?? getBasePaintDay()
    const source = await setFeaturedDailyArticle({
      day,
      articleUrl: body.articleUrl,
      articleTitle: body.articleTitle,
      articleAuthor: body.articleAuthor,
      enrich: body.enrich,
    })

    return NextResponse.json({
      success: true,
      challenge: {
        day: source.day,
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
        theme: source.theme,
        articleTitle: source.articleTitle,
        articleAuthor: source.articleAuthor,
        canvasTheme: source.canvasTheme,
        palette: source.palette,
        canvasUrl: source.canvasUrl,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.flatten() },
        { status: 400 }
      )
    }
    console.error('Set featured daily article failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to set featured article',
      },
      { status: 500 }
    )
  }
}
