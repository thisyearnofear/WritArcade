import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock cache to test both hit and miss paths
const mockCacheGet = vi.fn()
const mockCacheSet = vi.fn()
vi.mock('@/lib/cache', () => ({
  cacheGet: (...args: unknown[]) => mockCacheGet(...args),
  cacheSet: (...args: unknown[]) => mockCacheSet(...args),
}))

// Mock contracts (for on-chain distribution reads)
const mockFetchGenerationDistribution = vi.fn()
const mockFetchMintDistribution = vi.fn()
vi.mock('@/lib/contracts', () => ({
  fetchGenerationDistributionOnChain: (...args: unknown[]) => mockFetchGenerationDistribution(...args),
  fetchMintDistributionOnChain: (...args: unknown[]) => mockFetchMintDistribution(...args),
}))

// Use actual writerCoins for realistic test data
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'
import type { PaymentToken } from '@/lib/writer-coins'

describe('PaymentCostService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateCostSync', () => {
    it('returns correct cost for generate-game with known writer coin', () => {
      const cost = PaymentCostService.calculateCostSync('avc', 'generate-game')

      expect(cost.action).toBe('generate-game')
      expect(cost.amount).toBe(100000000000000000000n) // 100 AVC
      expect(cost.writerCoinId).toBe('avc')
      expect(cost.writerCoinSymbol).toBe('$AVC')
      expect(cost.decimals).toBe(18)
    })

    it('returns correct cost for mint-nft with known writer coin', () => {
      const cost = PaymentCostService.calculateCostSync('papa', 'mint-nft')

      expect(cost.action).toBe('mint-nft')
      expect(cost.amount).toBe(50000000000000000000n) // 50 PAPA
      expect(cost.writerCoinId).toBe('papa')
      expect(cost.writerCoinSymbol).toBe('$PARAPAPA')
    })

    it('throws for unknown writer coin', () => {
      expect(() => PaymentCostService.calculateCostSync('nonexistent', 'generate-game'))
        .toThrow('Writer coin "nonexistent" not found')
    })
  })

  describe('calculateCostTokenSync', () => {
    it('calculates cost for writercoin PaymentToken', () => {
      const token: PaymentToken = {
        type: 'writercoin',
        coin: {
          id: 'debbie',
          name: 'Debbie Soon',
          symbol: '$DEBBIE',
          address: '0x4ea5d3ff9e8295a552903d4bd486ce8cf8291c60',
          writer: 'Debbie Soon',
          paragraphAuthor: 'debbie',
          paragraphUrl: 'https://paragraph.com/@debbie',
          bio: '',
          gameGenerationCost: 100000000000000000000n,
          mintCost: 50000000000000000000n,
          decimals: 18,
          gameNftAddress: '0x0',
          paymentContractAddress: '0x0',
          paymentEnabled: true,
          revenueDistribution: { writer: 60, creator: 20, platform: 20, burn: 0 },
        },
      }

      const cost = PaymentCostService.calculateCostTokenSync(token, 'generate-game')
      expect(cost.amount).toBe(100000000000000000000n)
      expect(cost.writerCoinSymbol).toBe('$DEBBIE')
    })

    it('calculates cost for MUSD PaymentToken', () => {
      const token: PaymentToken = { type: 'musd', network: 'testnet' }

      const cost = PaymentCostService.calculateCostTokenSync(token, 'generate-game')
      expect(cost.amount).toBe(1000000000000000000n) // 1 MUSD
      expect(cost.writerCoinSymbol).toBe('MUSD')
      expect(cost.writerCoinId).toBe('musd-testnet')
      expect(cost.decimals).toBe(18)
    })

    it('calculates cost for MUSD mint-nft', () => {
      const token: PaymentToken = { type: 'musd', network: 'testnet' }

      const cost = PaymentCostService.calculateCostTokenSync(token, 'mint-nft')
      expect(cost.amount).toBe(500000000000000000n) // 0.5 MUSD
      expect(cost.writerCoinSymbol).toBe('MUSD')
    })

    it('calculates cost for credits PaymentToken', () => {
      const token: PaymentToken = { type: 'credits' }

      const cost = PaymentCostService.calculateCostTokenSync(token, 'generate-game')
      expect(cost.amount).toBe(10n)
      expect(cost.writerCoinSymbol).toBe('Credits')
      expect(cost.amountFormatted).toBe('10 Credits')
      expect(cost.decimals).toBe(0)
    })

    it('calculates credits cost for mint-nft', () => {
      const token: PaymentToken = { type: 'credits' }

      const cost = PaymentCostService.calculateCostTokenSync(token, 'mint-nft')
      expect(cost.amount).toBe(5n)
      expect(cost.amountFormatted).toBe('5 Credits')
    })
  })

  describe('calculateDistribution', () => {
    it('falls back to local config when on-chain read fails for generate-game', async () => {
      mockFetchGenerationDistribution.mockRejectedValue(new Error('RPC error'))

      const dist = await PaymentCostService.calculateDistribution('avc', 'generate-game')

      // AVC has: writer=60%, creator=20%, platform=20% for generation
      // amount = 100 AVC
      expect(dist.writerShare).toBe(60000000000000000000n) // 60%
      expect(dist.platformShare).toBe(20000000000000000000n) // 20%
      expect(dist.creatorShare).toBe(20000000000000000000n) // 20%
      // Total should equal the cost
      expect(dist.writerShare + dist.platformShare + dist.creatorShare).toBe(100000000000000000000n)
    })

    it('falls back to Base v2 default for mint-nft when on-chain read fails', async () => {
      mockFetchMintDistribution.mockRejectedValue(new Error('RPC error'))

      const dist = await PaymentCostService.calculateDistribution('avc', 'mint-nft')

      // Mint defaults: 50% creator, 15% writer, 5% platform
      // amount = 50 AVC
      expect(dist.creatorShare).toBe(25000000000000000000n) // 50%
      expect(dist.writerShare).toBe(7500000000000000000n) // 15%
      expect(dist.platformShare).toBe(2500000000000000000n) // 5%
    })

    it('returns cached distribution on repeated call with same params', async () => {
      mockCacheGet.mockReturnValueOnce({
        writerShare: 60000000000000000000n,
        platformShare: 20000000000000000000n,
        creatorShare: 20000000000000000000n,
      })

      const dist = await PaymentCostService.calculateDistribution('avc', 'generate-game')

      expect(dist.writerShare).toBe(60000000000000000000n)
      // Should not have fetched from on-chain
      expect(mockFetchGenerationDistribution).not.toHaveBeenCalled()
    })

    it('calls on-chain for generation distribution when available', async () => {
      mockCacheGet.mockReturnValue(null) // no cache
      mockFetchGenerationDistribution.mockResolvedValue({
        writerBP: 6000,
        platformBP: 2000,
        creatorBP: 2000,
      })

      const dist = await PaymentCostService.calculateDistribution('avc', 'generate-game')

      expect(mockFetchGenerationDistribution).toHaveBeenCalledWith('0x06FC3D5D2369561e28F261148576520F5e49D6ea')
      // 6000 BP = 60%
      expect(dist.writerShare).toBe(60000000000000000000n)
      // Should cache the result
      expect(mockCacheSet).toHaveBeenCalled()
    })

    it('calls on-chain for mint distribution when available', async () => {
      mockCacheGet.mockReturnValue(null)
      mockFetchMintDistribution.mockResolvedValue({
        creatorBP: 5000,
        writerBP: 1500,
        platformBP: 500,
      })

      const dist = await PaymentCostService.calculateDistribution('avc', 'mint-nft')

      expect(mockFetchMintDistribution).toHaveBeenCalledWith('0x06FC3D5D2369561e28F261148576520F5e49D6ea')
      expect(dist.creatorShare).toBe(25000000000000000000n) // 50%
      expect(mockCacheSet).toHaveBeenCalled()
    })

    it('throws for unknown writer coin', async () => {
      await expect(PaymentCostService.calculateDistribution('nonexistent', 'generate-game'))
        .rejects.toThrow('Writer coin "nonexistent" not found')
    })

    it('handles play-wordle with same cost as generate-game', async () => {
      mockCacheGet.mockReturnValue(null)
      mockFetchGenerationDistribution.mockRejectedValue(new Error('RPC error'))

      const dist = await PaymentCostService.calculateDistribution('avc', 'play-wordle')

      // Same amounts as generate-game (play-wordle uses the same cost/generation splits)
      expect(dist.writerShare).toBe(60000000000000000000n)
      expect(dist.platformShare).toBe(20000000000000000000n)
      expect(dist.creatorShare).toBe(20000000000000000000n)
    })
  })

  describe('formatCost', () => {
    it('formats bigint cost with symbol', () => {
      const result = PaymentCostService.formatCost(100000000000000000000n, 18, '$AVC')
      expect(result).toBe('100 $AVC')
    })

    it('formats zero decimals correctly', () => {
      const result = PaymentCostService.formatCost(10n, 0, 'Credits')
      expect(result).toBe('10 Credits')
    })

    it('formats fractional amounts', () => {
      // 1.5 MUSD rounds to 2 with .toFixed(0)
      const result = PaymentCostService.formatCost(1500000000000000000n, 18, 'MUSD')
      expect(result).toBe('2 MUSD')
    })
  })

  describe('formatDistribution', () => {
    it('formats all shares with the same symbol and decimals', () => {
      const distribution = {
        writerShare: 60000000000000000000n,
        platformShare: 20000000000000000000n,
        creatorShare: 20000000000000000000n,
      }

      const formatted = PaymentCostService.formatDistribution(distribution, 18, '$AVC')

      expect(formatted.writerShare).toBe('60 $AVC')
      expect(formatted.platformShare).toBe('20 $AVC')
      expect(formatted.creatorShare).toBe('20 $AVC')
    })
  })
})
