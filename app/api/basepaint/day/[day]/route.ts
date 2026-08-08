import { NextRequest, NextResponse } from 'next/server'
import {
  fetchBasePaintCanvasStats,
  fetchBasePaintTheme,
  fetchGamesForBasePaintDay,
  getBasePaintCanvasDescription,
  getBasePaintDailySource,
  countGamesForBasePaintDay,
} from '@/lib/basepaint'

/**
 * GET /api/basepaint/day/[day]
 * Archive payload: theme, stats, vision description, community games.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ day: string }> }
) {
  try {
    const { day: dayParam } = await params
    const day = parseInt(dayParam, 10)
    if (!Number.isFinite(day) || day < 1) {
      return NextResponse.json({ error: 'Invalid day' }, { status: 400 })
    }

    const [theme, stats, canvasDescription, games, storyCount] = await Promise.all([
      fetchBasePaintTheme(day),
      fetchBasePaintCanvasStats(day),
      getBasePaintCanvasDescription(day),
      fetchGamesForBasePaintDay(day),
      countGamesForBasePaintDay(day),
    ])

    if (!theme && !stats) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 })
    }

    const source = await getBasePaintDailySource(day, canvasDescription)

    return NextResponse.json({
      day,
      theme: theme?.theme ?? stats?.name ?? `BasePaint Day ${day}`,
      palette: theme?.palette ?? stats?.palette ?? [],
      canvasDescription: canvasDescription ?? undefined,
      promptText: source.promptText,
      stats,
      games,
      storyCount,
    })
  } catch (error) {
    console.error('[BasePaint] day archive failed:', error)
    return NextResponse.json({ error: 'Failed to load day archive' }, { status: 500 })
  }
}
