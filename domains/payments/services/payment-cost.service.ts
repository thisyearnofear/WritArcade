/**
 * Payment Cost Calculation Service
 * 
 * Single source of truth for calculating costs and revenue distribution
 * Used by both web app + mini app payment flows
 */

import { getWriterCoinById, MUSD_CONFIG, CREDITS_CONFIG } from '@/lib/writer-coins'
import type { PaymentToken } from '@/lib/writer-coins'
import type { PaymentAction, PaymentCost, RevenueDistribution } from '../types'

import { cacheGet, cacheSet } from '@/lib/cache'

export class PaymentCostService {
  /**
   * Calculate cost for a payment action
   */
  static calculateCostSync(writerCoinId: string, action: PaymentAction): PaymentCost {
    const coin = getWriterCoinById(writerCoinId)
    if (!coin) {
      throw new Error(`Writer coin "${writerCoinId}" not found`)
    }

    return this.calculateCostTokenSync({ type: 'writercoin', coin }, action)
  }

  /**
   * Calculate cost for a payment action using a PaymentToken
   */
  static calculateCostTokenSync(token: PaymentToken, action: PaymentAction): PaymentCost {
    if (token.type === 'musd') {
      const config = MUSD_CONFIG[token.network]
      const amount = action === 'generate-game' || action === 'play-wordle' ? config.gameGenerationCost : config.mintCost
      return {
        action,
        amount,
        amountFormatted: (Number(amount) / 10 ** config.decimals).toFixed(2),
        writerCoinId: `musd-${token.network}`,
        writerCoinSymbol: config.symbol,
        decimals: config.decimals,
      }
    }

    if (token.type === 'credits') {
      const amount = BigInt(CREDITS_CONFIG.cost[action] ?? 10)
      return {
        action,
        amount,
        amountFormatted: `${Number(amount)} Credits`,
        writerCoinId: 'credits',
        writerCoinSymbol: 'Credits',
        decimals: 0,
      }
    }

    const coin = token.coin
    const amount =
      action === 'generate-game' || action === 'play-wordle'
        ? coin.gameGenerationCost
        : coin.mintCost

    return {
      action,
      amount,
      amountFormatted: (Number(amount) / 10 ** coin.decimals).toFixed(2),
      writerCoinId: coin.id,
      writerCoinSymbol: coin.symbol,
      decimals: coin.decimals,
    }
  }

  /**
   * Calculate revenue distribution for a payment
   */
  static async calculateDistribution(
    writerCoinId: string,
    action: PaymentAction
  ): Promise<RevenueDistribution> {
    const coin = getWriterCoinById(writerCoinId)
    if (!coin) {
      throw new Error(`Writer coin "${writerCoinId}" not found`)
    }

    const amount =
      action === 'generate-game' || action === 'play-wordle'
        ? coin.gameGenerationCost
        : coin.mintCost

    const cacheKey = `dist:${coin.address}:${action}`
    const cached = cacheGet<RevenueDistribution>(cacheKey, 60_000)
    if (cached) return cached

    if (action === 'generate-game' || action === 'play-wordle') {
      // Prefer on-chain configuration for generation splits
      try {
        const { fetchGenerationDistributionOnChain } = await import('@/lib/contracts')
        const distribution = await fetchGenerationDistributionOnChain(coin.address)
        const { writerBP, platformBP, creatorBP } = distribution as { writerBP: number; platformBP: number; creatorBP: number }
        const res = {
          writerShare: (amount * BigInt(writerBP)) / BigInt(10000),
          platformShare: (amount * BigInt(platformBP)) / BigInt(10000),
          creatorShare: (amount * BigInt(creatorBP)) / BigInt(10000),
        }
        cacheSet(cacheKey, res)
        return res
      } catch {
        // Fallback to local config if on-chain read fails
        return {
          writerShare: (amount * BigInt(coin.revenueDistribution.writer)) / BigInt(100),
          platformShare: (amount * BigInt(coin.revenueDistribution.platform)) / BigInt(100),
          creatorShare: (amount * BigInt(coin.revenueDistribution.creator)) / BigInt(100),
        }
      }
    } else {
      // Prefer on-chain configuration for mint splits
      try {
        const { fetchMintDistributionOnChain } = await import('@/lib/contracts')
        const distribution = await fetchMintDistributionOnChain(coin.address)
        const { creatorBP, writerBP, platformBP } = distribution as { creatorBP: number; writerBP: number; platformBP: number }
        const res = {
          writerShare: (amount * BigInt(writerBP)) / BigInt(10000),
          platformShare: (amount * BigInt(platformBP)) / BigInt(10000),
          creatorShare: (amount * BigInt(creatorBP)) / BigInt(10000),
        }
        cacheSet(cacheKey, res)
        return res
      } catch {
        // Fallback to Base v2 default: 50/15/5 with 30% refunded to minter.
        return {
          writerShare: (amount * BigInt(15)) / BigInt(100),
          platformShare: (amount * BigInt(5)) / BigInt(100),
          creatorShare: (amount * BigInt(50)) / BigInt(100),
        }
      }
    }
  }

  /**
   * Format cost in human-readable form
   */
  static formatCost(amount: bigint, decimals: number, symbol: string): string {
    const formatted = (Number(amount) / 10 ** decimals).toFixed(0)
    return `${formatted} ${symbol}`
  }

  /**
   * Format distribution summary
   */
  static formatDistribution(
    distribution: RevenueDistribution,
    decimals: number,
    symbol: string
  ): {
    writerShare: string
    platformShare: string
    creatorShare: string
  } {
    return {
      writerShare: this.formatCost(distribution.writerShare, decimals, symbol),
      platformShare: this.formatCost(distribution.platformShare, decimals, symbol),
      creatorShare: this.formatCost(distribution.creatorShare, decimals, symbol),
    }
  }
}
