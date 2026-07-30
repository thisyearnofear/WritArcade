import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { optionalAuth } from '@/services/auth'
import { isAdmin } from '@/lib/constants'
import { authorizeGameOwner } from '@/domains/games/services/game-ownership.service'
import { z } from 'zod'

const approvalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
})

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * PATCH /api/games/[slug]/approve
 * Approve or reject a game based on article fidelity review
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const user = await optionalAuth()
    const body = await request.json()
    const validated = approvalSchema.parse(body)

    // Find game by slug
    const game = await prisma.game.findUnique({
      where: { slug },
      include: {
        user: true,
        payment: { include: { user: true } },
      },
    })

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      )
    }

    // Only the game owner or admin can approve
    const ownership = authorizeGameOwner({ game, user })
    const isUserAdmin = user?.walletAddress ? isAdmin(user.walletAddress) : false
    if (!ownership.authorized && !isUserAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update approval status
    const updated = await prisma.game.update({
      where: { id: game.id },
      data: {
        approvalStatus: validated.action === 'approve' ? 'approved' : 'rejected',
        approvedAt: validated.action === 'approve' ? new Date() : null,
        rejectionReason: validated.action === 'reject' ? (validated.reason || null) : null,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        slug: updated.slug,
        approvalStatus: updated.approvalStatus,
        approvedAt: updated.approvedAt,
      },
    })
  } catch (error) {
    console.error('Approval error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update approval status' },
      { status: 500 }
    )
  }
}
