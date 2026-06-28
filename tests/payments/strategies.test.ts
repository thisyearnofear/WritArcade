import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock wallet client
const mockWriteContract = vi.fn()
const mockWalletClient = {
  writeContract: (...args: unknown[]) => mockWriteContract(...args),
}

// Use real implementations for testing
import { WriterCoinStrategy } from '@/domains/payments/strategies/writer-coin.strategy'
import { MUSDStrategy } from '@/domains/payments/strategies/musd.strategy'
import type { PaymentToken } from '@/lib/writerCoins'

const USER_ADDRESS = '0x1234567890123456789012345678901234567890'
const SAMPLE_TX_HASH = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd'

function createWriterCoinToken(overrides?: Partial<PaymentToken>): PaymentToken {
  return {
    type: 'writercoin',
    coin: {
      id: 'avc',
      name: 'AVC',
      symbol: '$AVC',
      address: '0x06FC3D5D2369561e28F261148576520F5e49D6ea',
      writer: 'Fred Wilson',
      paragraphAuthor: 'fredwilson',
      paragraphUrl: 'https://avc.xyz/',
      bio: '',
      gameGenerationCost: 100000000000000000000n,
      mintCost: 50000000000000000000n,
      decimals: 18,
      gameNftAddress: '0x32D0356f533cC429F94Db73f383bBb21a459E16b',
      paymentContractAddress: '0x56Ee5A3f122da00B635DdbB319708e24450aEB89',
      paymentEnabled: true,
      revenueDistribution: { writer: 60, creator: 20, platform: 20, burn: 0 },
    },
    ...overrides,
  } as PaymentToken
}

/**
 * Helper to create a mock fetch response
 */
function okResponse(data: Record<string, unknown>) {
  return { ok: true, json: async () => data }
}

function failResponse(status: number, error: string) {
  return { ok: false, status, json: async () => ({ error }) }
}

describe('WriterCoinStrategy', () => {
  let strategy: WriterCoinStrategy

  beforeEach(() => {
    vi.clearAllMocks()
    strategy = new WriterCoinStrategy()
  })

  it('has correct metadata', () => {
    expect(strategy.id).toBe('writercoin')
    expect(strategy.name).toBe('WriterCoin (Base)')
    expect(strategy.chainId).toBe(8453)
  })

  it('throws on non-writercoin token type', async () => {
    const musdToken: PaymentToken = { type: 'musd', network: 'testnet' }

    await expect(strategy.executePayment({
      walletClient: mockWalletClient as never,
      userAddress: USER_ADDRESS,
      token: musdToken,
      action: 'generate-game',
      amount: '100000000000000000000',
    })).rejects.toThrow('Invalid token type for WriterCoinStrategy')
  })

  describe('happy path', () => {
    beforeEach(() => {
      // Setup fetch to match init + verify URLs
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/payments/initiate')) {
          return okResponse({
            contractAddress: '0x56Ee5A3f122da00B635DdbB319708e24450aEB89',
            amount: '100000000000000000000',
          })
        }
        if (url.includes('/api/payments/verify')) {
          return okResponse({ paymentId: 'pay-123' })
        }
        return failResponse(404, 'not found')
      })
    })

    it('completes generate-game flow', async () => {
      const token = createWriterCoinToken()
      const onStep = vi.fn()

      mockWriteContract
        .mockResolvedValueOnce('0xapproval')
        .mockResolvedValueOnce(SAMPLE_TX_HASH)

      const result = await strategy.executePayment({
        walletClient: mockWalletClient as never,
        userAddress: USER_ADDRESS,
        token,
        action: 'generate-game',
        amount: '100000000000000000000',
        onStep,
      })

      expect(result.transactionHash).toBe(SAMPLE_TX_HASH)
      expect(result.paymentId).toBe('pay-123')
      expect(onStep).toHaveBeenCalledWith('Payment complete!')

      // Verify approve called with correct args
      const wcToken = token as { type: 'writercoin'; coin: { address: string } }
      expect(mockWriteContract).toHaveBeenNthCalledWith(1, expect.objectContaining({
        address: wcToken.coin.address,
        functionName: 'approve',
        args: ['0x56Ee5A3f122da00B635DdbB319708e24450aEB89', BigInt('100000000000000000000')],
      }))

      // Verify payForGameGeneration called
      expect(mockWriteContract).toHaveBeenNthCalledWith(2, expect.objectContaining({
        address: '0x56Ee5A3f122da00B635DdbB319708e24450aEB89',
        functionName: 'payForGameGeneration',
        args: [wcToken.coin.address],
      }))
    })

    it('completes mint-nft flow', async () => {
      const token = createWriterCoinToken()

      mockWriteContract
        .mockResolvedValueOnce('0xapproval')
        .mockResolvedValueOnce(SAMPLE_TX_HASH)

      const result = await strategy.executePayment({
        walletClient: mockWalletClient as never,
        userAddress: USER_ADDRESS,
        token,
        action: 'mint-nft',
        amount: '50000000000000000000',
      })

      expect(result.transactionHash).toBe(SAMPLE_TX_HASH)
      expect(mockWriteContract).toHaveBeenNthCalledWith(2, expect.objectContaining({
        functionName: 'payAndMintGame',
        args: [expect.any(String), 'demo'],
      }))
    })
  })

  describe('error handling', () => {
    it('throws when initiate fails', async () => {
      mockFetch.mockResolvedValue(failResponse(400, 'Writer coin not enabled'))

      await expect(strategy.executePayment({
        walletClient: mockWalletClient as never,
        userAddress: USER_ADDRESS,
        token: createWriterCoinToken(),
        action: 'generate-game',
        amount: '100000000000000000000',
      })).rejects.toThrow('Writer coin not enabled')
    })

    it('throws when contract address is missing', async () => {
      mockFetch.mockResolvedValue(okResponse({ amount: '100' }))

      await expect(strategy.executePayment({
        walletClient: mockWalletClient as never,
        userAddress: USER_ADDRESS,
        token: createWriterCoinToken(),
        action: 'generate-game',
        amount: '100',
      })).rejects.toThrow('Invalid contract address')
    })

    it('throws when payment amount is missing', async () => {
      mockFetch.mockResolvedValue(okResponse({
        contractAddress: '0x56Ee5A3f122da00B635DdbB319708e24450aEB89',
      }))

      await expect(strategy.executePayment({
        walletClient: mockWalletClient as never,
        userAddress: USER_ADDRESS,
        token: createWriterCoinToken(),
        action: 'generate-game',
        amount: '100',
      })).rejects.toThrow('Invalid payment amount')
    })
  })

  describe('verify retry logic', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('retries verify on receipt-not-found error', async () => {
      const token = createWriterCoinToken()

      // Initiate
      mockFetch.mockResolvedValueOnce(okResponse({
        contractAddress: '0x56Ee5A3f122da00B635DdbB319708e24450aEB89',
        amount: '100',
      }))
      // Verify attempt 1 - receipt error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Transaction receipt could not be found' }),
      })
      // Verify attempt 2 - success
      mockFetch.mockResolvedValueOnce(okResponse({ paymentId: 'pay-789' }))

      mockWriteContract
        .mockResolvedValueOnce('0xapproval')
        .mockResolvedValueOnce(SAMPLE_TX_HASH)

      // Start execution but don't await yet — we need to advance timers
      const executePromise = strategy.executePayment({
        walletClient: mockWalletClient as never,
        userAddress: USER_ADDRESS,
        token,
        action: 'generate-game',
        amount: '100',
      })

      // Advance through the 3s verify delays: first delay (3s) + retry delay (3s) = 6s
      await vi.advanceTimersByTimeAsync(7000)

      const result = await executePromise
      expect(result.transactionHash).toBe(SAMPLE_TX_HASH)
      expect(result.paymentId).toBe('pay-789')
      // Called: 1 initiate + 2 verify attempts
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('throws after all verify retries exhausted', async () => {
      const token = createWriterCoinToken()

      mockFetch
        .mockResolvedValueOnce(okResponse({
          contractAddress: '0x56Ee5A3f122da00B635DdbB319708e24450aEB89',
          amount: '100',
        }))
        .mockResolvedValue(failResponse(500, 'Server error'))

      mockWriteContract
        .mockResolvedValueOnce('0xapproval')
        .mockResolvedValueOnce(SAMPLE_TX_HASH)

      const executePromise = strategy.executePayment({
        walletClient: mockWalletClient as never,
        userAddress: USER_ADDRESS,
        token,
        action: 'generate-game',
        amount: '100',
      })

      // Advance through all 3 verify delays (3s * 3 = 9s) + some buffer
      await vi.advanceTimersByTimeAsync(10000)

      await expect(executePromise).rejects.toThrow('Server error')
    })
  })
})

describe('MUSDStrategy', () => {
  let strategy: MUSDStrategy

  beforeEach(() => {
    vi.clearAllMocks()
    strategy = new MUSDStrategy()
  })

  it('has correct metadata', () => {
    expect(strategy.id).toBe('musd')
    expect(strategy.name).toBe('MUSD (Mezo)')
    expect(strategy.chainId).toBe(31611)
  })

  it('throws on non-musd token type', async () => {
    const writerCoinToken: PaymentToken = {
      type: 'writercoin',
      coin: {
        id: 'avc', name: 'AVC', symbol: '$AVC',
        address: '0x0', writer: '', paragraphAuthor: '',
        paragraphUrl: '', bio: '',
        gameGenerationCost: 100n, mintCost: 50n, decimals: 18,
        gameNftAddress: '0x0', paymentContractAddress: '0x0',
        paymentEnabled: true,
        revenueDistribution: { writer: 60, creator: 20, platform: 20, burn: 0 },
      },
    }

    await expect(strategy.executePayment({
      walletClient: mockWalletClient as never,
      userAddress: USER_ADDRESS,
      token: writerCoinToken,
      action: 'generate-game',
      amount: '1000000000000000000',
    })).rejects.toThrow('Invalid token type')

    expect(mockWriteContract).not.toHaveBeenCalled()
  })

  it('completes full happy path', async () => {
    const token: PaymentToken = { type: 'musd', network: 'testnet' }

    mockWriteContract
      .mockResolvedValueOnce('0xapproval')
      .mockResolvedValueOnce(SAMPLE_TX_HASH)

    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/payments/verify')) {
        return okResponse({ paymentId: 'musd-pay-123' })
      }
      return failResponse(404, 'not found')
    })

    const result = await strategy.executePayment({
      walletClient: mockWalletClient as never,
      userAddress: USER_ADDRESS,
      token,
      action: 'generate-game',
      amount: '1000000000000000000',
    })

    expect(result.transactionHash).toBe(SAMPLE_TX_HASH)
    expect(result.paymentId).toBe('musd-pay-123')

    // Verify approve was called on MUSD address
    expect(mockWriteContract).toHaveBeenNthCalledWith(1, expect.objectContaining({
      address: '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503',
      functionName: 'approve',
    }))

    // Verify payAndMintGame was called on splitter
    expect(mockWriteContract).toHaveBeenNthCalledWith(2, expect.objectContaining({
      address: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
      functionName: 'payAndMintGame',
    }))
  })
})
