import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock writerCoins
const mockGetWriterCoinById = vi.fn()
vi.mock('@/lib/writerCoins', () => ({
  getWriterCoinById: (...args: unknown[]) => mockGetWriterCoinById(...args),
  getPaymentEnabledWriterCoins: vi.fn(),
  isWriterCoinPaymentEnabled: vi.fn(),
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
  CREDITS_CONFIG: {
    address: '0x0',
    decimals: 0,
    symbol: 'Credits',
    name: 'Credits',
    gameGenerationCost: 10n,
    mintCost: 5n,
    cost: { 'generate-game': 10, 'mint-nft': 5, 'play-wordle': 1 },
  },
}))

// Mock contracts
const mockFetchCoinConfig = vi.fn()
vi.mock('@/lib/contracts', () => ({
  fetchCoinConfigOnChain: (...args: unknown[]) => mockFetchCoinConfig(...args),
}))

// Mock cache
vi.mock('@/lib/cache', () => ({
  cacheGet: vi.fn(() => null),
  cacheSet: vi.fn(),
}))

import type { NextRequest } from 'next/server'
import { POST } from '@/app/api/payments/initiate/route'

describe('POST /api/payments/initiate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns payment info for valid generate-game request', async () => {
    mockGetWriterCoinById.mockReturnValue({
      id: 'avc',
      name: 'AVC',
      symbol: '$AVC',
      address: '0x06FC3D5D2369561e28F261148576520F5e49D6ea',
      decimals: 18,
      paymentEnabled: true,
      chainId: 8453,
      gameGenerationCost: 100000000000000000000n,
      mintCost: 50000000000000000000n,
      paymentContractAddress: '0x56Ee5A3f122da00B635DdbB319708e24450aEB89',
      revenueDistribution: { writer: 60, creator: 20, platform: 20 },
    })

    mockFetchCoinConfig.mockResolvedValue({ enabled: true, generationCost: 100000000000000000000n, mintCost: 50000000000000000000n })

    const request = new Request('http://localhost:3000/api/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writerCoinId: 'avc', action: 'generate-game' }),
    }) as unknown as NextRequest

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.writerCoin.id).toBe('avc')
    expect(body.writerCoin.symbol).toBe('$AVC')
    expect(body.action).toBe('generate-game')
    expect(body.amount).toBe('100000000000000000000')
    expect(body.distribution).toBeDefined()
  })

  it('returns 400 for unknown writer coin', async () => {
    mockGetWriterCoinById.mockReturnValue(undefined)

    const request = new Request('http://localhost:3000/api/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writerCoinId: 'nonexistent', action: 'generate-game' }),
    }) as unknown as NextRequest

    const res = await POST(request)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('not configured')
  })

  it('returns 400 when payment is not enabled for coin', async () => {
    mockGetWriterCoinById.mockReturnValue({
      id: 'avc',
      name: 'AVC',
      symbol: '$AVC',
      address: '0x06FC3D5D2369561e28F261148576520F5e49D6ea',
      paymentEnabled: false,
    })

    const request = new Request('http://localhost:3000/api/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writerCoinId: 'avc', action: 'generate-game' }),
    }) as unknown as NextRequest

    const res = await POST(request)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('not enabled')
  })

  it('returns 400 for invalid action', async () => {
    const request = new Request('http://localhost:3000/api/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writerCoinId: 'avc', action: 'invalid-action' }),
    }) as unknown as NextRequest

    const res = await POST(request)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid request data')
  })

  it('returns 400 for missing writerCoinId', async () => {
    const request = new Request('http://localhost:3000/api/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate-game' }),
    }) as unknown as NextRequest

    const res = await POST(request)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid request data')
  })

  it('gracefully skips on-chain check when RPC fails', async () => {
    mockGetWriterCoinById.mockReturnValue({
      id: 'avc',
      name: 'AVC',
      symbol: '$AVC',
      address: '0x06FC3D5D2369561e28F261148576520F5e49D6ea',
      decimals: 18,
      paymentEnabled: true,
      chainId: 8453,
      gameGenerationCost: 100000000000000000000n,
      mintCost: 50000000000000000000n,
      paymentContractAddress: '0x56Ee5A3f122da00B635DdbB319708e24450aEB89',
      revenueDistribution: { writer: 60, creator: 20, platform: 20 },
    })

    // On-chain check fails
    mockFetchCoinConfig.mockRejectedValue(new Error('RPC timeout'))

    const request = new Request('http://localhost:3000/api/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writerCoinId: 'avc', action: 'generate-game' }),
    }) as unknown as NextRequest

    const res = await POST(request)
    const body = await res.json()

    // Should still succeed with local config
    expect(res.status).toBe(200)
    expect(body.amount).toBe('100000000000000000000')
  })
})
