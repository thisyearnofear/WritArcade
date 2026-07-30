import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { getActor } from '@/services/auth'
import { GameInsightsService } from '@/domains/games/services/game-insights.service'

/**
 * GET /api/games/[slug]/insights
 * Resonance analytics for a game — owner-gated.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params

    const actor = await getActor()
    if (!actor) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const game = await prisma.game.findUnique({
      where: { slug },
      select: { id: true, userId: true, ownerWallet: true, creatorWallet: true },
    })

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      )
    }

    const wallet = actor.user.walletAddress?.toLowerCase()
    const isOwner =
      (game.userId && game.userId === actor.user.id) ||
      (wallet &&
        (game.ownerWallet?.toLowerCase() === wallet ||
          game.creatorWallet?.toLowerCase() === wallet))

    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Not your game' },
        { status: 403 }
      )
    }

    const insights = await GameInsightsService.getGameInsights(game.id)

    return NextResponse.json({ success: true, data: insights })
  } catch (error) {
    console.error('[insights-route] Failed to load insights:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load insights' },
      { status: 500 }
    )
  }
}
