import type { GameMetadata } from '@/lib/contracts'

/**
 * Payment Domain Types
 * 
 * Unified payment structures for both web app + mini app
 */

export type PaymentAction = 'generate-game' | 'mint-nft' | 'play-wordle'

export interface PaymentCost {
  action: PaymentAction
  amount: bigint
  amountFormatted: string
  writerCoinId: string
  writerCoinSymbol: string
  decimals: number
}

export interface RevenueDistribution {
  writerShare: bigint
  platformShare: bigint
  creatorShare: bigint
}

export interface PaymentInfo {
  writerCoin: {
    id: string
    name: string
    symbol: string
    address: `0x${string}`
    decimals: number
  }
  action: PaymentAction
  amount: string // bigint as string
  amountFormatted: string
  distribution: {
    writerShare: string
    platformShare: string
    creatorShare: string
  }
  contractAddress: `0x${string}` | undefined
  chainId: number
  metadata?: GameMetadata
  tokenURI?: string
}

export interface PaymentInitiateRequest {
  writerCoinId: string
  action: PaymentAction
  gameId?: string
  userAddress?: string
}

export interface PaymentVerifyRequest {
  transactionHash: `0x${string}`
  writerCoinId: string
  action: PaymentAction
  gameId?: string
  userAddress?: string
  chainId?: number
}

export interface PaymentVerifyResult {
  success: boolean
  transactionHash: `0x${string}`
  verified: boolean
  error?: string
}
