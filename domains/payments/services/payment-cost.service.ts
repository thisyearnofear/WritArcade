/**
 * Payment Cost Calculation Service
 * 
 * Single source of truth for calculating costs and revenue distribution
 * Used by both web app + mini app payment flows
 */

import { getWriterCoinById } from '@/lib/writerCoins'
import type { PaymentAction, PaymentCost, RevenueDistribution } from '../types'

export class PaymentCostService {
  /**
   * Calculate cost for a payment action
   */
  static calculateCost(writerCoinId: string, action: PaymentAction): PaymentCost {
    const coin = getWriterCoinById(writerCoinId)
    if (!coin) {
      throw new Error(`Writer coin "${writerCoinId}" not found`)
    }

    const amount = action === 'generate-game' ? coin.gameGenerationCost : coin.mintCost

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
  static calculateDistribution(
    writerCoinId: string,
    action: PaymentAction
  ): RevenueDistribution {
    const coin = getWriterCoinById(writerCoinId)
    if (!coin) {
      throw new Error(`Writer coin "${writerCoinId}" not found`)
    }

    const amount = action === 'generate-game' ? coin.gameGenerationCost : coin.mintCost

    if (action === 'generate-game') {
      // Game generation: 35% writer, 35% creator, 20% burn, 10% platform
      return {
        writerShare: (amount * BigInt(coin.revenueDistribution.writer)) / BigInt(100),
        platformShare: (amount * BigInt(coin.revenueDistribution.platform)) / BigInt(100),
        creatorShare: (amount * BigInt(coin.revenueDistribution.creator)) / BigInt(100),
      }
    } else {
      // NFT minting: 30% creator, 15% writer, 5% platform, 50% user
      return {
        writerShare: (amount * BigInt(15)) / BigInt(100),
        platformShare: (amount * BigInt(5)) / BigInt(100),
        creatorShare: (amount * BigInt(30)) / BigInt(100),
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
