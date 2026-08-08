import { NextRequest, NextResponse } from 'next/server'
import {
  getBasePaintDay,
  getBasePaintDailySource,
  getTodaysDailySource,
  getBasePaintCanvasDescription,
  fetchBasePaintTheme,
  getBasePaintCanvasUrl,
  fetchBasePaintCanvasStats,
} from '@/lib/basepaint'
import { config } from '@/lib/config'

/**
 * GET /api/daily-challenge/basepaint/[day]
 *
 * Fetches BasePaint theme + canvas image for a given day (or today if no day).
 * Used by the game generator to use BasePaint artwork as a story source.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ day?: string }> }
) {
  try {
    const { day: dayParam } = await params
    const day = dayParam ? parseInt(dayParam, 10) : getBasePaintDay()

    if (isNaN(day) || day < 1) {
      return NextResponse.json({ error: 'Invalid day number' }, { status: 400 })
    }

    const [theme, canvasStats] = await Promise.all([
      fetchBasePaintTheme(day),
      fetchBasePaintCanvasStats(day),
    ])

    if (!theme) {
      return NextResponse.json(
        { error: 'BasePaint theme not found for this day' },
        { status: 404 }
      )
    }

    const canvasUrl = getBasePaintCanvasUrl(day)
    const canvasDescription = await getBasePaintCanvasDescription(day)
    const isToday = day === getBasePaintDay()
    const source =
      isToday && config.dailyChallenge.featuredArticleUrl
        ? await getTodaysDailySource(day, {
            canvasDescription,
            enrichArticle: true,
          })
        : await getBasePaintDailySource(day, canvasDescription)

    return NextResponse.json({
      day,
      sourceType: source.sourceType,
      sourceUrl: 'sourceUrl' in source ? source.sourceUrl : undefined,
      articleTitle: 'articleTitle' in source ? source.articleTitle : undefined,
      articleAuthor: 'articleAuthor' in source ? source.articleAuthor : undefined,
      theme: source.theme,
      canvasTheme: theme.theme,
      proposer: theme.proposer,
      palette: theme.palette,
      canvasSize: theme.size,
      canvasUrl,
      canvasDescription: canvasDescription || undefined,
      promptText: source.promptText,
      stats: canvasStats
        ? {
            pixelsCount: canvasStats.pixelsCount,
            totalArtists: canvasStats.totalArtists,
            totalMints: canvasStats.totalMints,
            topContributors: canvasStats.topContributors,
          }
        : undefined,
    })
  } catch (error) {
    console.error('BasePaint fetch failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BasePaint theme' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/daily-challenge/basepaint
 *
 * Returns today's BasePaint daily source (no day param).
 */
export async function GET_today() {
  try {
    const day = getBasePaintDay()
    const source = await getBasePaintDailySource(day)

    return NextResponse.json(source)
  } catch (error) {
    console.error('BasePaint today fetch failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch today\'s BasePaint canvas' },
      { status: 500 }
    )
  }
}
