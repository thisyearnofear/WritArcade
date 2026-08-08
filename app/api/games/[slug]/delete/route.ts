import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { authorizeGameOwner, ownershipError } from '@/domains/games/services/game-ownership.service'

/**
 * DELETE /api/games/[slug]/delete
 * Permanently delete a game.
 *
 * Ownership is derived from the authenticated wallet session cookie — never
 * from a caller-supplied body field.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    await request.json().catch(() => ({}))

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

    if (game.nftTokenId) {
      return NextResponse.json(
        { error: 'Cannot delete game: Already minted as NFT. NFT records are permanent on-chain.' },
        { status: 400 }
      )
    }

    await prisma.game.delete({ where: { slug } })

    return NextResponse.json({
      success: true,
      data: { slug, deletedAt: new Date(), message: 'Game permanently deleted' },
    })
  } catch (error) {
    console.error('Game deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 })
  }
}
