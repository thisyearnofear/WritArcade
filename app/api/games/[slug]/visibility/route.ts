import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/games/[slug]/visibility
 * Toggle game visibility (public/private)
 * 
 * Body:
 * - visible: boolean (true for public, false for private)
 * - wallet: string (user's wallet, for ownership verification)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { visible, wallet } = body

    if (typeof visible !== 'boolean' || !wallet) {
      return NextResponse.json(
        { error: 'Missing required fields: visible (boolean), wallet' },
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

    // Update visibility
    const updated = await prisma.game.update({
      where: { slug },
      data: { private: !visible },
    })

    return NextResponse.json({
      success: true,
      data: {
        slug,
        private: updated.private,
        message: `Game is now ${!updated.private ? 'public' : 'private'}`,
      },
    })
  } catch (error) {
    console.error('Visibility update error:', error)
    return NextResponse.json(
      { error: 'Failed to update visibility' },
      { status: 500 }
    )
  }
}
