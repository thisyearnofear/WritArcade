import { NextRequest, NextResponse } from 'next/server'
import { getWriterCoinById } from '@/lib/writer-coins'
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'
import type { PaymentInitiateRequest, PaymentInfo } from '@/domains/payments/types'
import { prisma } from '@/lib/database'
import { gameToMetadata } from '@/lib/contracts'
import { uploadToIPFS } from '@/domains/story/services/ipfs-utils'
import { z } from 'zod'

/**
 * Initiate a payment for game generation or NFT minting (Mini App)
 * 
 * Uses unified PaymentCostService - same logic as web app
 * This endpoint prepares payment information and returns it to the frontend,
 * where the user approves spending in their Farcaster wallet.
 */

const initiatePaymentSchema = z.object({
  writerCoinId: z.string().min(1, 'Writer coin ID is required'),
  action: z.enum(['generate-game', 'mint-nft'], {
    errorMap: () => ({ message: 'Action must be generate-game or mint-nft' })
  }),
  gameId: z.string().optional(),
  userAddress: z.string().optional(),
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

    // Calculate cost and distribution using unified service
    const cost = PaymentCostService.calculateCostSync(validatedData.writerCoinId, validatedData.action)
    const distribution = await PaymentCostService.calculateDistribution(validatedData.writerCoinId, validatedData.action)

    // Return payment info
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
      contractAddress: (process.env.NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS as `0x${string}`) || undefined,
      chainId: 8453, // Base mainnet
    }

    // Special handling for NFT minting: prepare metadata
    if (validatedData.action === 'mint-nft') {
      if (!validatedData.gameId) {
        return NextResponse.json(
          { error: 'Game ID is required for minting' },
          { status: 400 }
        )
      }

      if (!validatedData.userAddress) {
        return NextResponse.json(
          { error: 'User address is required for minting' },
          { status: 400 }
        )
      }

      const game = await prisma.game.findUnique({
        where: { id: validatedData.gameId },
      })

      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        )
      }

      // Generate metadata
      const gameMetadata = gameToMetadata({
        articleUrl: game.articleUrl || '',
        creator: validatedData.userAddress,
        writerCoinId: writerCoin.id,
        genre: game.genre || 'mystery',
        difficulty: game.difficulty || 'easy',
        createdAt: game.createdAt || new Date(),
        gameTitle: game.title,
      })

      // Upload to IPFS
      const ipfsMetadata = {
        name: game.title,
        description: game.description || `A ${game.genre} game generated from an article`,
        image: game.imageUrl || '', // Should be IPFS URL ideally
        attributes: [
          { trait_type: 'genre', value: game.genre || 'mystery' },
          { trait_type: 'difficulty', value: game.difficulty || 'easy' },
          { trait_type: 'creator', value: validatedData.userAddress },
          { trait_type: 'created_at', value: game.createdAt ? new Date(game.createdAt).toISOString() : new Date().toISOString() },
        ],
        external_url: game.articleUrl,
      }

      const tokenURI = await uploadToIPFS(ipfsMetadata)

      paymentInfo.metadata = gameMetadata
      paymentInfo.tokenURI = tokenURI
    }

    return NextResponse.json(paymentInfo)
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
