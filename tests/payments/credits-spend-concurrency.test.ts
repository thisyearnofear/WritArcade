import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetActor = vi.fn()
vi.mock('@/services/auth', () => ({ getActor: () => mockGetActor() }))

const mockTx = vi.fn()
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: (...a: unknown[]) => mockTx(...a) } }))

vi.mock('@/lib/writer-coins', () => ({
  CREDITS_CONFIG: { cost: { 'generate-game': 10, 'mint-nft': 5, 'play-wordle': 1, 'video-upsell': 2 } },
}))

import type { NextRequest } from 'next/server'
import { POST } from '@/app/api/credits/spend/route'

function makeRequest(action = 'generate-game') {
  return new Request('http://localhost:3000/api/credits/spend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  }) as unknown as NextRequest
}

function walletActor(credits = 100) {
  return { identity: 'wallet', user: { id: 'u1', walletAddress: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', credits } }
}

function fakeTx(updateCount: number) {
  return {
    user: {
      updateMany: vi.fn().mockResolvedValue({ count: updateCount }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ credits: 90 }),
    },
    creditTransaction: { create: vi.fn().mockResolvedValue({ id: 'ct-1' }) },
    payment: { create: vi.fn().mockResolvedValue({ id: 'pay-1' }) },
  }
}

describe('POST /api/credits/spend — concurrent spend safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects without a session', async () => {
    mockGetActor.mockResolvedValue(null)
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('spends atomically when the conditional decrement matches', async () => {
    mockGetActor.mockResolvedValue(walletActor())
    mockTx.mockImplementation(async (fn: unknown) => {
      const tx = fakeTx(1) // updateMany matched -> balance reserved
      return (fn as (t: unknown) => Promise<unknown>)(tx)
    })
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.paymentId).toBe('pay-1')
  })

  it('rejects with 409 when the balance is already consumed (concurrent request)', async () => {
    mockGetActor.mockResolvedValue(walletActor())
    mockTx.mockImplementation(async (fn: unknown) => {
      const tx = fakeTx(0) // updateMany matched nothing -> route throws conflict symbol
      return (fn as (t: unknown) => Promise<unknown>)(tx)
    })
    const res = await POST(makeRequest())
    expect(res.status).toBe(409)
  })
})