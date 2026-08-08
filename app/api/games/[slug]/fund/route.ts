import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getActor } from '@/services/auth'
import { normalizeWallet } from '@/domains/games/services/game-ownership.service'
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
 *
 * Binding: the operation is authorized only when BOTH hold —
 *  1. The authenticated wallet owns the game (or the game is still un-owned).
 *  2. The authenticated wallet is the wallet that made the payment.
 * A payment made by one wallet can never fund another user's game.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const body = await request.json()
    const validated = fundSchema.parse(body)

    const actor = await getActor()
    const actorWallet = actor?.identity === 'wallet' ? actor.user.walletAddress?.toLowerCase() : null
    if (!actorWallet) {
      return NextResponse.json({ success: false, error: 'Wallet authentication is required' }, { status: 401 })
    }

    const game = await prisma.game.findUnique({
      where: { slug },
      select: {
        id: true,
        writerCoinId: true,
        paymentId: true,
        ownerWallet: true,
        creatorWallet: true,
        userId: true,
        user: { select: { walletAddress: true } },
      },
    })

    if (!game) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 })
    }

    // Already funded
    if (game.writerCoinId) {
      return NextResponse.json({
        success: true,
        alreadyFunded: true,
        writerCoinId: game.writerCoinId,
      })
    }

    // The authenticated wallet must own the game — unless the game has no owner yet
    // (then the acting wallet claims it). Never fund a game owned by someone else.
    const ownerCandidates = [game.ownerWallet, game.creatorWallet, game.user?.walletAddress].filter(Boolean)
    const ownsGame = ownerCandidates.length === 0 || ownerCandidates.some((w) => normalizeWallet(w) === actorWallet)
    if (!ownsGame) {
      return NextResponse.json({ success: false, error: 'Only the game owner can fund this game.' }, { status: 403 })
    }

    // Verify the payment exists, is verified, and is for game generation.
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

    // The authenticated wallet must be the wallet that made the payment (credits
    // funding must belong to the same authenticated user).
    if (funding.ownershipSource === 'credits_user') {
      if (!actor?.user.id || funding.userId !== actor.user.id) {
        return NextResponse.json({ success: false, error: 'This payment does not belong to you.' }, { status: 403 })
      }
    } else if (normalizeWallet(funding.walletAddress) !== actorWallet) {
      return NextResponse.json(
        { success: false, error: 'This payment was not made by the authenticated wallet.' },
        { status: 403 }
      )
    }

    // Ensure this payment isn't already linked to a different game.
    const existingLink = await prisma.game.findFirst({
      where: {
        paymentId: funding.paymentId,
        id: { not: game.id },
      },
      select: { id: true },
    })

    if (existingLink) {
      return NextResponse.json({ success: false, error: 'This payment is already linked to another game.' }, { status: 409 })
    }

    await prisma.game.update({
      where: { id: game.id },
      data: {
        paymentId: funding.paymentId,
        writerCoinId: funding.writerCoinId,
        ownerWallet: funding.walletAddress ?? actorWallet,
        ownershipSource: funding.ownershipSource,
        creatorWallet: funding.walletAddress ?? actorWallet,
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
