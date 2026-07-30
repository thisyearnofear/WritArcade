import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

/**
 * PATCH /api/games/[slug]/play
 * Increments the play counter for a game and logs a play event.
 * Called when a play session completes.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // Optional sessionId ties the completion to its started/choice events
    const sessionId: string | null = await request
      .json()
      .then((body) => (typeof body?.sessionId === 'string' ? body.sessionId.slice(0, 64) : null))
      .catch(() => null)

    const game = await prisma.game.update({
      where: { slug },
      data: {
        playCount: { increment: 1 },
        lastPlayedAt: new Date(),
      },
    })

    // Log a play event for trend analytics
    await prisma.gamePlayEvent.create({
      data: {
        gameId: game.id,
        type: 'completed',
        sessionId,
        playedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: { playCount: game.playCount, lastPlayedAt: game.lastPlayedAt },
    })
  } catch (error) {
    console.error('[play-route] Failed to increment play count:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to increment play count' },
      { status: 500 }
    )
  }
}
