/**
 * PaymentStrategyFactory
 *
 * Central factory for selecting and instantiating the correct payment strategy
 * based on the token type. This introduces dependency injection for payment
 * strategies, making the payment domain independently testable and the
 * strategy selection logic centralized.
 *
 * Usage:
 *   const factory = PaymentStrategyFactory.getInstance()
 *   const strategy = factory.getStrategy(paymentToken)
 *   const result = await strategy.executePayment({...})
 */

import type { PaymentStrategy } from '../strategies/payment-strategy'
import type { PaymentToken } from '@/lib/writer-coins'
import { WriterCoinStrategy } from '../strategies/writer-coin.strategy'
import { MUSDStrategy } from '../strategies/musd.strategy'

export class PaymentStrategyFactory {
  private static instance: PaymentStrategyFactory
  /** Allow injecting custom strategies for testing */
  private strategies: Map<string, PaymentStrategy> = new Map()

  private constructor() {
    // Register default strategies
    this.register(new WriterCoinStrategy())
    this.register(new MUSDStrategy())
  }

  static getInstance(): PaymentStrategyFactory {
    if (!PaymentStrategyFactory.instance) {
      PaymentStrategyFactory.instance = new PaymentStrategyFactory()
    }
    return PaymentStrategyFactory.instance
  }

  /** Register a strategy by its id */
  register(strategy: PaymentStrategy): void {
    this.strategies.set(strategy.id, strategy)
  }

  /** Get a strategy by id (for direct lookup) */
  getStrategyById(id: string): PaymentStrategy {
    const strategy = this.strategies.get(id)
    if (!strategy) {
      throw new Error(`No payment strategy registered for id "${id}"`)
    }
    return strategy
  }

  /**
   * Resolve the correct strategy for a given PaymentToken.
   * This is the primary entry point for consumers.
   */
  getStrategy(token: PaymentToken): PaymentStrategy {
    switch (token.type) {
      case 'writercoin':
        return this.getStrategyById('writercoin')
      case 'musd':
        return this.getStrategyById('musd')
      case 'credits':
        throw new Error('Credits use a non-blockchain payment path — no on-chain strategy required')
      default:
        throw new Error(`Unsupported payment token type: ${(token as PaymentToken).type}`)
    }
  }

  /** Get all registered strategies (for debugging / admin UIs) */
  getAllStrategies(): PaymentStrategy[] {
    return Array.from(this.strategies.values())
  }

  /** Clear all registered strategies (useful for testing) */
  reset(): void {
    this.strategies.clear()
  }
}
