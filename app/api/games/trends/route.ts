import { NextRequest, NextResponse } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'

/**
 * GET /api/games/trends?slug=game-slug
 * Returns daily play counts for the last 30 days for a specific game.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'slug query parameter is required' },
        { status: 400 }
      )
    }

    const trends = await GameDatabaseService.getGamePlayTrends(slug)

    return NextResponse.json({ success: true, data: trends })
  } catch (error) {
    console.error('[trends-route] Failed to fetch play trends:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch play trends' },
      { status: 500 }
    )
  }
}
