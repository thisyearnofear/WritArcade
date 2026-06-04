import { NextRequest, NextResponse } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { cacheGet, cacheSet } from '@/lib/cache'

// NOTE: The POST (game creation) endpoint lives at /api/games/generate.
// This file handles the GET listing only, so client components can call
// GET /api/games?limit=12&offset=0&search=...&genre=...&featured=true
// without importing server-side Prisma services.

const CACHE_TTL_MS = 60_000 // 60-second in-process cache

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || undefined
    const genre = searchParams.get('genre') || undefined
    const featured = searchParams.get('featured') === 'true'
    const writerCoinId = searchParams.get('writerCoinId') || undefined
    const requireFunding = searchParams.get('requireFunding') === 'true'
    const requireImage = searchParams.get('requireImage') === 'true'
    const includeLegacy = searchParams.get('includeLegacy') === 'true'
    const requireArtifact = searchParams.has('requireArtifact')
      ? searchParams.get('requireArtifact') === 'true'
      : !includeLegacy

    // Cache key is the full param set — skip cache for search queries
    const cacheKey = search
      ? null
      : `games:${limit}:${offset}:${genre ?? ''}:${featured}:${writerCoinId ?? ''}:${requireFunding}:${requireImage}:${requireArtifact}`

    if (cacheKey) {
      const cached = cacheGet<unknown>(cacheKey, CACHE_TTL_MS)
      if (cached) {
        return NextResponse.json({ success: true, data: cached })
      }
    }

    const result = await GameDatabaseService.getGames({
      limit,
      offset,
      search,
      genre,
      featured,
      writerCoinId,
      requireFunding,
      requireImage,
      requireArtifact,
      includePrivate: false,
    })

    if (cacheKey) cacheSet(cacheKey, result)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('GET /api/games error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
