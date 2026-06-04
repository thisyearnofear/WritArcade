import { NextRequest, NextResponse } from 'next/server'
import { getWriterCoinById } from '@/lib/writerCoins'
import { fetchCoinConfigOnChain } from '@/lib/contracts'
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'
import type { PaymentInitiateRequest, PaymentInfo } from '@/domains/payments/types'
import { z } from 'zod'

/**
 * Unified Payment Initiation Endpoint
 * 
 * Used by both web app and mini app to initiate payments
 * Returns payment details and cost breakdown
 */

const initiatePaymentSchema = z.object({
  writerCoinId: z.string().min(1, 'Writer coin ID is required'),
  action: z.enum(['generate-game', 'mint-nft'], {
    errorMap: () => ({ message: 'Action must be generate-game or mint-nft' }),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = initiatePaymentSchema.parse(body) as PaymentInitiateRequest

    // Get writer coin config
    const writerCoin = getWriterCoinById(validatedData.writerCoinId)
    if (!writerCoin) {
      return NextResponse.json(
        { error: `Writer coin "${validatedData.writerCoinId}" is not configured` },
        { status: 400 }
      )
    }

    if (!writerCoin.paymentEnabled) {
      return NextResponse.json(
        {
          error: `${writerCoin.symbol} is not enabled for Base writer-coin payments yet. Use MUSD on Mezo for this article.`,
        },
        { status: 400 }
      )
    }

    try {
      const onChainConfig = await fetchCoinConfigOnChain(writerCoin.address, writerCoin.chainId)
      if (!onChainConfig.enabled) {
        return NextResponse.json(
          {
            error: `${writerCoin.symbol} is not whitelisted by the Base payment contract yet. Use MUSD on Mezo for this article.`,
          },
          { status: 400 }
        )
      }
    } catch (error) {
      console.warn('[Payment Initiate] Skipping on-chain whitelist check:', {
        writerCoinId: writerCoin.id,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Calculate cost and distribution using shared service
    const cost = PaymentCostService.calculateCostSync(validatedData.writerCoinId, validatedData.action)
    const distribution = await PaymentCostService.calculateDistribution(validatedData.writerCoinId, validatedData.action)

    // Build response
    const paymentInfo: PaymentInfo = {
      writerCoin: {
        id: writerCoin.id,
        name: writerCoin.name,
        symbol: writerCoin.symbol,
        address: writerCoin.address,
        decimals: writerCoin.decimals,
      },
      action: validatedData.action,
      amount: cost.amount.toString(),
      amountFormatted: cost.amountFormatted,
      distribution: {
        writerShare: distribution.writerShare.toString(),
        platformShare: distribution.platformShare.toString(),
        creatorShare: distribution.creatorShare.toString(),
      },
      contractAddress: (process.env.NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS as `0x${string}`) || writerCoin.paymentContractAddress,
      chainId: writerCoin.chainId ?? 8453, // Base mainnet
    }

    return NextResponse.json(paymentInfo)
  } catch (error) {
    console.error('[Payment Initiate] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 })
  }
}
