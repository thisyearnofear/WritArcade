import { NextRequest, NextResponse } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'

/**
 * GET /api/games/by-slugs?slugs=slug-a,slug-b,slug-c
 *
 * Returns public games matching the given slugs, preserving the input
 * order (so the caller can sort by recency). Used by the "Continue
 * playing" homepage section, which stores recently-played slugs in
 * localStorage.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slugsParam = searchParams.get('slugs') || ''

    const slugs = slugsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (slugs.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Cap at 12 to prevent abuse
    const cappedSlugs = slugs.slice(0, 12)

    const games = await GameDatabaseService.getGamesBySlugs(cappedSlugs)

    return NextResponse.json({ success: true, data: games })
  } catch (error) {
    console.error('GET /api/games/by-slugs error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
