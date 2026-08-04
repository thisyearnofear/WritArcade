import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { CREDITS_CONFIG } from '@/lib/writerCoins'
import { getActor } from '@/services/auth'
import { z } from 'zod'

const spendSchema = z.object({
  action: z.enum(['generate-game', 'mint-nft', 'play-wordle', 'video-upsell']),
  gameId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = spendSchema.parse(body)
    const { action } = validated

    // Identity comes from the signed session cookie, never the request body.
    const actor = await getActor()
    if (!actor) {
      return NextResponse.json(
        { error: 'Sign in to spend credits.' },
        { status: 401 }
      )
    }
    const user = actor.user

    const cost = CREDITS_CONFIG.cost[action]
    if (!cost) {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      )
    }

    if (user.credits < cost) {
      return NextResponse.json(
        {
          error: `Insufficient credits. You need ${cost} credits but have ${user.credits}.`,
          credits: user.credits,
          required: cost,
        },
        { status: 402 }
      )
    }

    // Sentinel hash: never collides with real 0x tx hashes, satisfies the
    // unique constraint, and lets the generate route verify credits funding
    // through the same Payment lookup as on-chain payments.
    const sentinelHash = `credits:${randomBytes(16).toString('hex')}`

    const [updatedUser, , payment] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: cost } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          fiatAmount: 0,
          creditAmount: -cost,
          status: 'completed',
          completedAt: new Date(),
        },
      }),
      prisma.payment.create({
        data: {
          transactionHash: sentinelHash,
          action,
          amount: cost,
          status: 'verified',
          verifiedAt: new Date(),
          writerCoinId: 'credits',
          userId: user.id,
          walletAddress: user.walletAddress ?? null,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        creditsRemaining: updatedUser.credits,
        cost,
        action,
        paymentId: payment.id,
        message: `Paid ${cost} credits for ${action}`,
      },
    })
  } catch (error) {
    console.error('[Credits Spend] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to spend credits' },
      { status: 500 }
    )
  }
}
