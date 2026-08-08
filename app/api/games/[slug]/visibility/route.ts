import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { authorizeGameOwner, ownershipError } from '@/domains/games/services/game-ownership.service'

/**
 * PATCH /api/games/[slug]/visibility
 * Toggle game visibility (public/private).
 *
 * Ownership is derived from the authenticated wallet session cookie — never
 * from a caller-supplied body field.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { visible } = body

    if (typeof visible !== 'boolean') {
      return NextResponse.json({ error: 'Missing required field: visible (boolean)' }, { status: 400 })
    }

    const actor = await getActor()
    const actorWallet = actor?.identity === 'wallet' ? actor.user.walletAddress?.toLowerCase() : null
    if (!actorWallet) {
      return NextResponse.json({ error: 'Wallet authentication is required' }, { status: 401 })
    }

    const game = await prisma.game.findUnique({
      where: { slug },
      include: {
        user: true,
        payment: { include: { user: true } },
      },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const ownership = authorizeGameOwner({ game, wallet: actorWallet })
    if (!ownership.authorized) {
      return NextResponse.json({ error: ownershipError() }, { status: 403 })
    }

    const updated = await prisma.game.update({
      where: { slug },
      data: { private: !visible },
    })

    return NextResponse.json({
      success: true,
      data: { slug, private: updated.private, message: `Game is now ${!updated.private ? 'public' : 'private'}` },
    })
  } catch (error) {
    console.error('Visibility update error:', error)
    return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 })
  }
}
