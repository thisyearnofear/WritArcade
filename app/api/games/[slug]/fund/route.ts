import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { GameFundingService } from '@/domains/payments/services/game-funding.service'

const fundSchema = z.object({
  paymentId: z.string().optional(),
  transactionHash: z.string().optional(),
}).refine(data => data.paymentId || data.transactionHash, {
  message: 'Either paymentId or transactionHash is required',
})

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * POST /api/games/[slug]/fund
 * Link a verified payment to an unfunded game, enabling minting.
 * Used when a game was generated without payment and the user pays afterwards.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const body = await request.json()
    const validated = fundSchema.parse(body)

    // Find the game
    const game = await prisma.game.findUnique({
      where: { slug },
      select: {
        id: true,
        writerCoinId: true,
        paymentId: true,
      },
    })

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      )
    }

    // Already funded
    if (game.writerCoinId) {
      return NextResponse.json({
        success: true,
        alreadyFunded: true,
        writerCoinId: game.writerCoinId,
      })
    }

    // Verify the payment exists, is verified, and is for game generation
    const lookup = validated.paymentId
      ? { paymentId: validated.paymentId } as const
      : { transactionHash: validated.transactionHash! } as const
    const funding = await GameFundingService.getVerifiedCreationPayment(lookup)

    if (!funding) {
      return NextResponse.json(
        { success: false, error: 'Payment not found or not verified. Please ensure your payment transaction has completed.' },
        { status: 400 }
      )
    }

    // Ensure this payment isn't already linked to a different game
    const existingLink = await prisma.game.findFirst({
      where: {
        paymentId: funding.paymentId,
        id: { not: game.id },
      },
      select: { id: true },
    })

    if (existingLink) {
      return NextResponse.json(
        { success: false, error: 'This payment is already linked to another game.' },
        { status: 409 }
      )
    }

    // Link payment to game
    await prisma.game.update({
      where: { id: game.id },
      data: {
        paymentId: funding.paymentId,
        writerCoinId: funding.writerCoinId,
        ownerWallet: funding.walletAddress,
        ownershipSource: funding.ownershipSource,
        creatorWallet: funding.walletAddress,
      },
    })

    return NextResponse.json({
      success: true,
      writerCoinId: funding.writerCoinId,
    })
  } catch (error) {
    console.error('[Fund Game] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fund game' },
      { status: 500 }
    )
  }
}
