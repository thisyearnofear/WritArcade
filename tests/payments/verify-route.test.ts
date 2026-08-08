import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetActor = vi.fn()
vi.mock('@/services/auth', () => ({ getActor: () => mockGetActor() }))

const mockVerify = vi.fn()
vi.mock('@/services/payments/payment-verifier', () => ({
  verifyOnChainPayment: (...args: unknown[]) => mockVerify(...args),
}))

const mockFindUnique = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/lib/database', () => ({
  prisma: {
    payment: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

vi.mock('@/lib/config', () => ({
  logger: { payment: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

vi.mock('@/services/error-reporting', () => ({ reportServerError: vi.fn() }))

import type { NextRequest } from 'next/server'
import { POST } from '@/app/api/payments/verify/route'

const USER = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
const TX_HASH = '0x' + 'a'.repeat(64)

function walletActor(address = USER) {
  return { identity: 'wallet', user: { id: 'u1', walletAddress: address } }
}

function makeRequest(body: unknown): NextRequest {
  return new Request('http://localhost:3000/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

function validBody(overrides?: Record<string, unknown>) {
  return {
    transactionHash: TX_HASH,
    writerCoinId: 'avc',
    action: 'generate-game',
    userAddress: USER,
    chainId: 8453,
    ...overrides,
  }
}

describe('POST /api/payments/verify — auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActor.mockResolvedValue(null)
  })

  it('rejects when there is no authenticated wallet session', async () => {
    const res = await POST(makeRequest(validBody()))
    expect(res.status).toBe(401)
  })

  it('rejects when the session is email/guest identity (not a wallet)', async () => {
    mockGetActor.mockResolvedValue({ identity: 'email', user: { id: 'u9', walletAddress: null } })
    const res = await POST(makeRequest(validBody()))
    expect(res.status).toBe(401)
  })

  it('rejects when userAddress does not match the authenticated wallet', async () => {
    mockGetActor.mockResolvedValue(walletActor())
    const res = await POST(makeRequest(validBody({ userAddress: '0x' + 'b'.repeat(40) })))
    expect(res.status).toBe(403)
  })
})

describe('POST /api/payments/verify — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActor.mockResolvedValue(walletActor())
  })

  it('rejects an invalid transaction hash', async () => {
    const res = await POST(makeRequest(validBody({ transactionHash: '0xnotahash' })))
    expect(res.status).toBe(400)
  })

  it('rejects an invalid user address', async () => {
    const res = await POST(makeRequest(validBody({ userAddress: 'nope' })))
    expect(res.status).toBe(400)
  })

  it('rejects an invalid action', async () => {
    const res = await POST(makeRequest(validBody({ action: 'nope' })))
    expect(res.status).toBe(400)
  })
})
describe('POST /api/payments/verify — success + hash immutability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActor.mockResolvedValue(walletActor())
    mockVerify.mockResolvedValue({ txHash: TX_HASH, amount: '100000000000000000000', functionName: 'payForGameGeneration' })
  })

  it('records a verified payment and returns paymentId', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'pay-1', status: 'verified' })
    const res = await POST(makeRequest(validBody()))
    expect(res.status).toBe(200)
    expect(mockVerify).toHaveBeenCalledWith(
      expect.objectContaining({ transactionHash: TX_HASH, writerCoinId: 'avc', action: 'generate-game' })
    )
    expect(mockCreate).toHaveBeenCalledWith(
      { data: expect.objectContaining({ transactionHash: TX_HASH, status: 'verified', userId: 'u1', walletAddress: USER }) }
    )
  })

  it('is idempotent when the same hash is re-submitted with identical metadata', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'pay-1',
      action: 'generate-game',
      walletAddress: USER,
      chainId: 8453,
      writerCoinId: 'avc',
      status: 'verified',
      transactionHash: TX_HASH,
    })
    const res = await POST(makeRequest(validBody()))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.idempotent).toBe(true)
    expect(mockVerify).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 409 when the same hash is reused for a different action or coin', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'pay-1',
      action: 'generate-game',
      walletAddress: USER,
      chainId: 8453,
      writerCoinId: 'avc',
      status: 'verified',
      transactionHash: TX_HASH,
    })
    const res = await POST(makeRequest(validBody({ action: 'mint-nft' })))
    expect(res.status).toBe(409)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 409 when the same hash is reused for a different wallet', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'pay-1',
      action: 'generate-game',
      walletAddress: '0x' + 'b'.repeat(40),
      chainId: 8453,
      writerCoinId: 'avc',
      status: 'verified',
      transactionHash: TX_HASH,
    })
    const res = await POST(makeRequest(validBody({ userAddress: USER })))
    expect(res.status).toBe(409)
  })

  it('surfaces on-chain verification errors as 400', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockVerify.mockRejectedValue(new Error('Expected payment event was not found in the transaction logs'))
    const res = await POST(makeRequest(validBody()))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/event was not found/i)
  })
})
