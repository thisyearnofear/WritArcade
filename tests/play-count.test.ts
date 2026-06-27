import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the prisma client
const mockGameUpdate = vi.fn()
const mockGamePlayEventCreate = vi.fn()

vi.mock('@/lib/database', () => ({
  prisma: {
    game: {
      update: (...args: unknown[]) => mockGameUpdate(...args),
    },
    gamePlayEvent: {
      create: (...args: unknown[]) => mockGamePlayEventCreate(...args),
    },
  },
}))

describe('Play count increment (route handler)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('increments playCount by 1 and sets lastPlayedAt', async () => {
    mockGameUpdate.mockResolvedValue({
      id: 'game-1',
      slug: 'test-game',
      playCount: 5,
      lastPlayedAt: new Date(),
    })
    mockGamePlayEventCreate.mockResolvedValue({ id: 'event-1', gameId: 'game-1', playedAt: new Date() })

    const { PATCH } = await import('@/app/api/games/[slug]/play/route')

    const request = new Request('http://localhost:3000/api/games/test-game/play', { method: 'PATCH' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await PATCH(request as any, { params: { slug: 'test-game' } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.playCount).toBe(5)
    expect(body.data.lastPlayedAt).toBeDefined()

    // Verify prisma was called with increment
    expect(mockGameUpdate).toHaveBeenCalledWith({
      where: { slug: 'test-game' },
      data: {
        playCount: { increment: 1 },
        lastPlayedAt: expect.any(Date),
      },
    })

    // Verify game play event was logged
    expect(mockGamePlayEventCreate).toHaveBeenCalledWith({
      data: {
        gameId: 'game-1',
        playedAt: expect.any(Date),
      },
    })
  })

  it('returns 500 when prisma update fails', async () => {
    mockGameUpdate.mockRejectedValue(new Error('Database error'))

    const { PATCH } = await import('@/app/api/games/[slug]/play/route')

    const request = new Request('http://localhost:3000/api/games/test-game/play', { method: 'PATCH' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await PATCH(request as any, { params: { slug: 'test-game' } })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Failed to increment play count')
  })
})
