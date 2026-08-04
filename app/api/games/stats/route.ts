import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { cacheGet, cacheSet } from '@/lib/cache'
import { ok } from '@/lib/api-response'

const CACHE_KEY = 'games:stats'
const CACHE_TTL_MS = 5 * 60_000 // 5 minutes

export async function GET() {
  try {
    const cached = cacheGet<{ totalGames: number; publicGames: number; totalPlays: number }>(CACHE_KEY, CACHE_TTL_MS)
    if (cached) {
      return ok(cached)
    }

    const stats = await GameDatabaseService.getGameStats()
    const data = { totalGames: stats.totalGames, publicGames: stats.publicGames, totalPlays: stats.totalPlays }
    cacheSet(CACHE_KEY, data)

    return ok(data)
  } catch {
    // Return zeroed stats rather than erroring — the homepage degrades gracefully
    return ok({ totalGames: 0, publicGames: 0, totalPlays: 0 })
  }
}
