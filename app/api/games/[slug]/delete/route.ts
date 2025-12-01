import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/games/[slug]/delete
 * Permanently delete a game
 * 
 * Body:
 * - wallet: string (user's wallet, for ownership verification)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { wallet } = body

    if (!wallet) {
      return NextResponse.json(
        { error: 'Missing required field: wallet' },
        { status: 400 }
      )
    }

    // Validate wallet format
    if (!wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Fetch game
    const game = await prisma.game.findUnique({
      where: { slug },
      include: { user: true },
    })

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (game.user?.walletAddress?.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this game' },
        { status: 403 }
      )
    }

    // Prevent deletion if NFT minted (preserve on-chain record)
    if (game.nftTokenId) {
      return NextResponse.json(
        {
          error: 'Cannot delete game: Already minted as NFT. NFT records are permanent on-chain.',
        },
        { status: 400 }
      )
    }

    // Delete game
    const deleted = await prisma.game.delete({
      where: { slug },
    })

    return NextResponse.json({
      success: true,
      data: {
        slug,
        deletedAt: new Date(),
        message: 'Game permanently deleted',
      },
    })
  } catch (error) {
    console.error('Game deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete game' },
      { status: 500 }
    )
  }
}
