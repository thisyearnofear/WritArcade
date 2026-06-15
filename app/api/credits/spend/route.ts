import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CREDITS_CONFIG } from '@/lib/writerCoins'
import { z } from 'zod'

const spendSchema = z.object({
  walletAddress: z.string().min(1),
  action: z.enum(['generate-game', 'mint-nft', 'play-wordle']),
  gameId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = spendSchema.parse(body)
    const { walletAddress, action, gameId } = validated

    const cost = CREDITS_CONFIG.cost[action]
    if (!cost) {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Connect your wallet first.' },
        { status: 404 }
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

    const [updatedUser] = await prisma.$transaction([
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
    ])

    return NextResponse.json({
      success: true,
      data: {
        creditsRemaining: updatedUser.credits,
        cost,
        action,
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
