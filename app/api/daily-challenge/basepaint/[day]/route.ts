import { NextRequest, NextResponse } from 'next/server'
import {
  getBasePaintDay,
  getBasePaintDailySource,
  getBasePaintCanvasDescription,
  fetchBasePaintTheme,
  getBasePaintCanvasUrl,
} from '@/lib/daily-challenge'

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

    const theme = await fetchBasePaintTheme(day)
    if (!theme) {
      return NextResponse.json(
        { error: 'BasePaint theme not found for this day' },
        { status: 404 }
      )
    }

    const canvasUrl = getBasePaintCanvasUrl(day)
    // Vision-describe what the community actually drew so generated stories
    // are grounded in the artwork, not just the theme word. Cached per day;
    // null is fine — the source falls back to a theme-only prompt.
    const canvasDescription = await getBasePaintCanvasDescription(day)
    const source = await getBasePaintDailySource(day, canvasDescription)

    return NextResponse.json({
      day,
      theme: theme.theme,
      proposer: theme.proposer,
      palette: theme.palette,
      canvasSize: theme.size,
      canvasUrl,
      canvasDescription: canvasDescription || undefined,
      promptText: source.promptText,
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
