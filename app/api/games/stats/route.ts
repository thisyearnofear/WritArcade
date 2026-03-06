import { NextResponse } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { cacheGet, cacheSet } from '@/lib/cache'

const CACHE_KEY = 'games:stats'
const CACHE_TTL_MS = 5 * 60_000 // 5 minutes

export async function GET() {
  try {
    const cached = cacheGet<{ totalGames: number; publicGames: number }>(CACHE_KEY, CACHE_TTL_MS)
    if (cached) {
      return NextResponse.json({ success: true, data: cached })
    }

    const stats = await GameDatabaseService.getGameStats()
    const data = { totalGames: stats.totalGames, publicGames: stats.publicGames }
    cacheSet(CACHE_KEY, data)

    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: true, data: { totalGames: 0, publicGames: 0 } })
  }
}
