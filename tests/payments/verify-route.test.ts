import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/headers cookies (used by getCurrentUser inside the route)
const mockCookieGet = vi.fn(() => undefined)
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: mockCookieGet,
  }),
}))

// Mock prisma
const mockPaymentUpsert = vi.fn()
vi.mock('@/lib/database', () => ({
  prisma: {
    payment: {
      upsert: (...args: unknown[]) => mockPaymentUpsert(...args),
    },
  },
}))

// Mock auth — no user by default
const mockGetCurrentUser = vi.fn()
vi.mock('@/services/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}))

// Mock config logger
vi.mock('@/lib/config', () => ({
  logger: {
    payment: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock error reporting
vi.mock('@/services/error-reporting', () => ({
  reportServerError: vi.fn(),
}))

// Mock writerCoins
const mockGetWriterCoinById = vi.fn()
vi.mock('@/lib/writerCoins', () => ({
  getWriterCoinById: (...args: unknown[]) => mockGetWriterCoinById(...args),
  MUSD_CONFIG: {
    testnet: {
      address: '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503',
      paymentSplitter: '0x5eEb15C32F54B242B07B5Dc23859a3DC71D0C592',
      chainId: 31611,
      decimals: 18,
      symbol: 'MUSD',
      name: 'Mezo USD',
      gameGenerationCost: 1000000000000000000n,
      mintCost: 500000000000000000n,
    },
    mainnet: {
      address: '0x0',
      paymentSplitter: '0x0',
      chainId: 31612,
      decimals: 18,
      symbol: 'MUSD',
      name: 'Mezo USD',
      gameGenerationCost: 1000000000000000000n,
      mintCost: 500000000000000000n,
    },
  },
}))

// Mock viem — receipt verification is stubbed per-test
const mockGetTransactionReceipt = vi.fn()
const mockGetTransaction = vi.fn()
vi.mock('viem', () => ({
  createPublicClient: () => ({
    getTransactionReceipt: (...args: unknown[]) => mockGetTransactionReceipt(...args),
    getTransaction: (...args: unknown[]) => mockGetTransaction(...args),
  }),
  http: () => ({}),
}))

// Mock chains
vi.mock('@/lib/chains', () => ({
  BASE_MAINNET_CHAIN_ID: 8453,
  MEZO_TESTNET_CHAIN_ID: 31611,
}))

import type { NextRequest } from 'next/server'
import { POST } from '@/app/api/payments/verify/route'

const USER_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
const TX_HASH = '0x' + 'a'.repeat(64)
const MUSD_SPLITTER = '0x5eEb15C32F54B242B07B5Dc23859a3DC71D0C592'

function makeRequest(body: unknown): NextRequest {
  return new Request('http://localhost:3000/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

describe('POST /api/payments/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentUser.mockResolvedValue(null)
    mockCookieGet.mockReturnValue(undefined)
    mockPaymentUpsert.mockResolvedValue({
      id: 'pay-1',
      status: 'verified',
      transactionHash: TX_HASH,
    })
  })

  it('returns 200 and paymentId for a valid verified MUSD payment', async () => {
    mockGetTransactionReceipt.mockResolvedValue({ status: 'success' })
    mockGetTransaction.mockResolvedValue({
      from: USER_ADDRESS,
      to: MUSD_SPLITTER,
    })

    const res = await POST(
      makeRequest({
        transactionHash: TX_HASH,
        writerCoinId: 'musd-testnet',
        action: 'generate-game',
        userAddress: USER_ADDRESS,
        chainId: 31611,
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.paymentId).toBe('pay-1')
    expect(body.status).toBe('verified')
  })

  it('returns 400 when transactionHash is malformed', async () => {
    const res = await POST(
      makeRequest({
        transactionHash: '0xnotahash',
        writerCoinId: 'musd-testnet',
        action: 'generate-game',
        userAddress: USER_ADDRESS,
        chainId: 31611,
      })
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when userAddress is invalid', async () => {
    const res = await POST(
      makeRequest({
        transactionHash: TX_HASH,
        writerCoinId: 'musd-testnet',
        action: 'generate-game',
        userAddress: 'not-an-address',
        chainId: 31611,
      })
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when action is invalid', async () => {
    const res = await POST(
      makeRequest({
        transactionHash: TX_HASH,
        writerCoinId: 'musd-testnet',
        action: 'invalid-action',
        userAddress: USER_ADDRESS,
        chainId: 31611,
      })
    )
    expect(res.status).toBe(400)
  })

  it('rejects when the transaction failed on-chain', async () => {
    mockGetTransactionReceipt.mockResolvedValue({ status: 'reverted' })
    mockGetTransaction.mockResolvedValue({
      from: USER_ADDRESS,
      to: MUSD_SPLITTER,
    })

    const res = await POST(
      makeRequest({
        transactionHash: TX_HASH,
        writerCoinId: 'musd-testnet',
        action: 'generate-game',
        userAddress: USER_ADDRESS,
        chainId: 31611,
      })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/did not succeed/i)
  })

  it('rejects when sender does not match the connected wallet', async () => {
    mockGetTransactionReceipt.mockResolvedValue({ status: 'success' })
    mockGetTransaction.mockResolvedValue({
      from: '0x' + 'b'.repeat(40), // different sender
      to: MUSD_SPLITTER,
    })

    const res = await POST(
      makeRequest({
        transactionHash: TX_HASH,
        writerCoinId: 'musd-testnet',
        action: 'generate-game',
        userAddress: USER_ADDRESS,
        chainId: 31611,
      })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/sender/i)
  })

  it('rejects when payment was sent to the wrong contract', async () => {
    mockGetTransactionReceipt.mockResolvedValue({ status: 'success' })
    mockGetTransaction.mockResolvedValue({
      from: USER_ADDRESS,
      to: '0x' + 'c'.repeat(40), // wrong contract
    })

    const res = await POST(
      makeRequest({
        transactionHash: TX_HASH,
        writerCoinId: 'musd-testnet',
        action: 'generate-game',
        userAddress: USER_ADDRESS,
        chainId: 31611,
      })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/expected payment contract/i)
  })

  it('returns an error on RPC failure', async () => {
    mockGetTransactionReceipt.mockRejectedValue(new Error('RPC timeout'))

    const res = await POST(
      makeRequest({
        transactionHash: TX_HASH,
        writerCoinId: 'musd-testnet',
        action: 'generate-game',
        userAddress: USER_ADDRESS,
        chainId: 31611,
      })
    )
    // The route surfaces Error instances as 400 with the message
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/RPC timeout/i)
  })
})
