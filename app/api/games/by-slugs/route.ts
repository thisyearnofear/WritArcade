import { NextRequest } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { ok, fail } from '@/lib/api-response'

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
      return ok([])
    }

    // Cap at 12 to prevent abuse
    const cappedSlugs = slugs.slice(0, 12)

    const games = await GameDatabaseService.getGamesBySlugs(cappedSlugs)

    return ok(games)
  } catch (error) {
    console.error('GET /api/games/by-slugs error:', error)
    return fail('Failed to fetch games', 500)
  }
}
