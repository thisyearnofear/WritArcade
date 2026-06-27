import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
const mockFindMany = vi.fn()
const mockCount = vi.fn()
const mockAggregate = vi.fn()
const mockGroupBy = vi.fn()
const mockGamePlayEventCount = vi.fn()
const mockGamePlayEventFindMany = vi.fn()
const mockGameFindUnique = vi.fn()

vi.mock('@/lib/database', () => ({
  prisma: {
    game: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      aggregate: (...args: unknown[]) => mockAggregate(...args),
      findUnique: (...args: unknown[]) => mockGameFindUnique(...args),
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
    },
    gamePlayEvent: {
      count: (...args: unknown[]) => mockGamePlayEventCount(...args),
      findMany: (...args: unknown[]) => mockGamePlayEventFindMany(...args),
    },
  },
}))

describe('GameDatabaseService sort logic', () => {
  let GameDatabaseService: typeof import('@/domains/games/services/game-database.service').GameDatabaseService

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/domains/games/services/game-database.service')
    GameDatabaseService = mod.GameDatabaseService
  })

  describe('getGames sortBy', () => {
    it('defaults to sorting by createdAt desc', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await GameDatabaseService.getGames({ limit: 10 })

      const callArgs = mockFindMany.mock.calls[0][0]
      expect(callArgs.orderBy).toEqual({ createdAt: 'desc' })
    })

    it('sorts by playCount desc when sortBy=playCount', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await GameDatabaseService.getGames({ limit: 10, sortBy: 'playCount' })

      const callArgs = mockFindMany.mock.calls[0][0]
      expect(callArgs.orderBy).toEqual([
        { playCount: 'desc' },
        { createdAt: 'desc' },
      ])
    })

    it('passes where clause with private:false by default', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await GameDatabaseService.getGames({ limit: 10 })

      const callArgs = mockFindMany.mock.calls[0][0]
      const where = callArgs.where
      // Check the AND array contains private: false
      const andClauses = where.AND as Record<string, unknown>[]
      expect(andClauses.some((c: Record<string, unknown>) => c.private === false)).toBe(true)
    })

    it('returns empty result on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB down'))

      const result = await GameDatabaseService.getGames({ limit: 10 })

      expect(result.games).toEqual([])
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('getGameStats with play trends', () => {
    it('includes playsToday and playsThisWeek in error fallback', async () => {
      // Simulate error (e.g. groupBy not matching exactly)
      mockCount.mockRejectedValue(new Error('DB error'))

      const result = await GameDatabaseService.getGameStats()

      // Error fallback returns zeros
      expect(result.totalGames).toBe(0)
      expect(result.playsToday).toBe(0)
      expect(result.playsThisWeek).toBe(0)
      expect(result.totalPlays).toBe(0)
    })

    it('parses topGenres from groupBy result', async () => {
      mockCount
        .mockResolvedValueOnce(20)   // totalGames
        .mockResolvedValueOnce(15)   // publicGames
        .mockResolvedValueOnce(2)    // recentGames
      mockAggregate.mockResolvedValue({ _sum: { playCount: 42 } })
      mockGamePlayEventCount
        .mockResolvedValueOnce(3)    // playsToday
        .mockResolvedValueOnce(12)   // playsThisWeek
      mockGroupBy.mockResolvedValue([
        { genre: 'Adventure', _count: { genre: 5 } },
        { genre: 'Puzzle', _count: { genre: 3 } },
      ])

      const result = await GameDatabaseService.getGameStats()

      expect(result.totalGames).toBe(20)
      expect(result.publicGames).toBe(15)
      expect(result.totalPlays).toBe(42)
      expect(result.playsToday).toBe(3)
      expect(result.playsThisWeek).toBe(12)
      expect(result.topGenres).toEqual([
        { genre: 'Adventure', count: 5 },
        { genre: 'Puzzle', count: 3 },
      ])
    })
  })

  describe('getGamePlayTrends', () => {
    it('returns empty array when game not found', async () => {
      mockGameFindUnique.mockResolvedValue(null)

      const trends = await GameDatabaseService.getGamePlayTrends('nonexistent-slug')
      expect(trends).toEqual([])
    })

    it('returns 30 days of data with zeroes for missing days', async () => {
      mockGameFindUnique.mockResolvedValue({ id: 'game-1' })
      mockGamePlayEventFindMany.mockResolvedValue([])

      const trends = await GameDatabaseService.getGamePlayTrends('test-game')
      expect(trends.length).toBe(30)
      expect(trends.every((t: { count: number }) => t.count === 0)).toBe(true)
    })

    it('groups events by date correctly', async () => {
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

      mockGameFindUnique.mockResolvedValue({ id: 'game-1' })
      mockGamePlayEventFindMany.mockResolvedValue([
        { playedAt: today },
        { playedAt: today },
        { playedAt: yesterday },
      ])

      const trends = await GameDatabaseService.getGamePlayTrends('test-game')
      expect(trends.length).toBe(30)

      const todayKey = today.toISOString().split('T')[0]
      const yesterdayKey = yesterday.toISOString().split('T')[0]

      const todayEntry = trends.find((t: { date: string }) => t.date === todayKey)
      const yesterdayEntry = trends.find((t: { date: string }) => t.date === yesterdayKey)

      expect(todayEntry?.count).toBe(2)
      expect(yesterdayEntry?.count).toBe(1)
    })

    it('returns empty array on database error', async () => {
      mockGameFindUnique.mockRejectedValue(new Error('DB error'))

      const trends = await GameDatabaseService.getGamePlayTrends('test-game')
      expect(trends).toEqual([])
    })
  })
})
