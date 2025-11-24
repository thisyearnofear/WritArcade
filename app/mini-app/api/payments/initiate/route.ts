import { NextRequest, NextResponse } from 'next/server'
import { getWriterCoinById } from '@/lib/writerCoins'
import { z } from 'zod'

/**
 * Initiate a payment for game generation or NFT minting
 * 
 * This endpoint prepares payment information and returns it to the frontend,
 * where the user approves spending in their Farcaster wallet.
 */

const initiatePaymentSchema = z.object({
  writerCoinId: z.string().min(1, 'Writer coin ID is required'),
  action: z.enum(['generate-game', 'mint-nft'], {
    errorMap: () => ({ message: 'Action must be generate-game or mint-nft' })
  }),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = initiatePaymentSchema.parse(body)

    // Get writer coin config
    const writerCoin = getWriterCoinById(validatedData.writerCoinId)
    if (!writerCoin) {
      return NextResponse.json(
        { error: `Writer coin "${validatedData.writerCoinId}" is not configured` },
        { status: 400 }
      )
    }

    // Determine the amount based on action
    const amount = validatedData.action === 'generate-game'
      ? writerCoin.gameGenerationCost
      : writerCoin.mintCost

    // Calculate revenue distribution
    let distribution = {
      writerShare: 0n,
      platformShare: 0n,
      creatorShare: 0n,
    }

    if (validatedData.action === 'generate-game') {
      // Game generation distribution: 60% writer, 20% platform, 20% creator
      distribution.writerShare = (amount * BigInt(writerCoin.revenueDistribution.writer)) / BigInt(100)
      distribution.platformShare = (amount * BigInt(writerCoin.revenueDistribution.platform)) / BigInt(100)
      distribution.creatorShare = (amount * BigInt(writerCoin.revenueDistribution.creatorPool)) / BigInt(100)
    } else {
      // NFT minting distribution: 30% creator, 15% writer, 5% platform, 50% to user
      const creatorShare = (amount * BigInt(30)) / BigInt(100)
      const writerShare = (amount * BigInt(15)) / BigInt(100)
      const platformShare = (amount * BigInt(5)) / BigInt(100)
      
      distribution.writerShare = writerShare
      distribution.platformShare = platformShare
      distribution.creatorShare = creatorShare
    }

    // Return payment info
    return NextResponse.json({
      writerCoin: {
        id: writerCoin.id,
        name: writerCoin.name,
        symbol: writerCoin.symbol,
        address: writerCoin.address,
        decimals: writerCoin.decimals,
      },
      action: validatedData.action,
      amount: amount.toString(),
      amountFormatted: (Number(amount) / 10 ** writerCoin.decimals).toFixed(2),
      distribution: {
        writerShare: distribution.writerShare.toString(),
        platformShare: distribution.platformShare.toString(),
        creatorShare: distribution.creatorShare.toString(),
      },
      contractAddress: process.env.NEXT_PUBLIC_WRITER_COIN_PAYMENT_SEPOLIA,
      chainId: 84532, // Base Sepolia
    })
  } catch (error) {
    console.error('Payment initiation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    )
  }
}
