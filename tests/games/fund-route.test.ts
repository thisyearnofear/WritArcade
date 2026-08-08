import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetActor = vi.fn()
vi.mock('@/services/auth', () => ({ getActor: () => mockGetActor() }))

const mockFindUnique = vi.fn()
const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    game: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

const mockGetVerifiedCreationPayment = vi.fn()
vi.mock('@/domains/payments/services/game-funding.service', () => ({
  GameFundingService: {
    getVerifiedCreationPayment: (...args: unknown[]) => mockGetVerifiedCreationPayment(...args),
  },
}))

import type { NextRequest } from 'next/server'
import { POST } from '@/app/api/games/[slug]/fund/route'

const OWNER = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
const PAYER = '0x' + 'c'.repeat(40)
const SLUG = 'my-game'

function makeRequest(): NextRequest {
  return new Request(`http://localhost:3000/api/games/${SLUG}/fund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: 'pay-1' }),
  }) as unknown as NextRequest
}

function walletActor(address = OWNER) {
  return { identity: 'wallet', user: { id: 'u1', walletAddress: address } }
}

const fundedGame = {
  id: 'g1',
  slug: SLUG,
  writerCoinId: null,
  paymentId: null,
  ownerWallet: OWNER,
  creatorWallet: OWNER,
  userId: 'u1',
  user: { walletAddress: OWNER },
}

describe('POST /api/games/[slug]/fund — owner + payer binding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects without an authenticated wallet session', async () => {
    mockGetActor.mockResolvedValue(null)
    const res = await POST(makeRequest(), { params: Promise.resolve({ slug: SLUG }) })
    expect(res.status).toBe(401)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects when the payment was made by a different wallet (cannot fund another user\'s game)', async () => {
    mockGetActor.mockResolvedValue(walletActor(OWNER)) // authenticated owner
    mockFindUnique.mockResolvedValue(fundedGame)
    mockGetVerifiedCreationPayment.mockResolvedValue({
      paymentId: 'pay-1',
      writerCoinId: 'avc',
      walletAddress: PAYER, // payment made by someone else
      ownershipSource: 'payment_wallet',
    })
    const res = await POST(makeRequest(), { params: Promise.resolve({ slug: SLUG }) })
    expect(res.status).toBe(403)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects a non-owner authenticated wallet even when their payment matches', async () => {
    // The payment wallet == actor, but the authenticated user is NOT the game owner.
    mockGetActor.mockResolvedValue(walletActor(PAYER))
    mockFindUnique.mockResolvedValue(fundedGame) // game owned by OWNER
    mockGetVerifiedCreationPayment.mockResolvedValue({
      paymentId: 'pay-1',
      writerCoinId: 'avc',
      walletAddress: PAYER,
      ownershipSource: 'payment_wallet',
    })
    const res = await POST(makeRequest(), { params: Promise.resolve({ slug: SLUG }) })
    expect(res.status).toBe(403)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('allows funding when the authenticated owner is also the payer', async () => {
    mockGetActor.mockResolvedValue(walletActor(OWNER))
    mockFindUnique.mockResolvedValue(fundedGame)
    mockGetVerifiedCreationPayment.mockResolvedValue({
      paymentId: 'pay-1',
      writerCoinId: 'avc',
      walletAddress: OWNER,
      ownershipSource: 'payment_wallet',
    })
    mockFindFirst.mockResolvedValue(null)
    mockUpdate.mockResolvedValue({})
    const res = await POST(makeRequest(), { params: Promise.resolve({ slug: SLUG }) })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('returns alreadyFunded when the game is already funded', async () => {
    mockGetActor.mockResolvedValue(walletActor(OWNER))
    mockFindUnique.mockResolvedValue({ ...fundedGame, writerCoinId: 'avc' })
    const res = await POST(makeRequest(), { params: Promise.resolve({ slug: SLUG }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alreadyFunded).toBe(true)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})