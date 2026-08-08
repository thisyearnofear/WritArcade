import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/constants'
import { getActor } from '@/services/auth'
import { authorizeGameOwner } from '@/domains/games/services/game-ownership.service'

/**
 * PATCH /api/games/[slug]/settings
 * Update game settings (play fee, visibility, featured status).
 *
 * Ownership and admin status are derived from the authenticated session cookie,
 * never from a caller-supplied body field.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const body = await request.json()
        const { playFee, private: isPrivate, featured } = body

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
        const isOwner = ownership.authorized
        const isUserAdmin = isAdmin(actorWallet)

        if (!isOwner && !isUserAdmin) {
            return NextResponse.json(
                { error: 'Unauthorized. Only the owner or an admin can update settings.' },
                { status: 403 }
            )
        }

        const updateData: Record<string, unknown> = {}

        if (typeof isPrivate === 'boolean') {
            updateData.private = isPrivate
        }

        if (typeof featured === 'boolean') {
            if (!isUserAdmin) {
                return NextResponse.json(
                    { error: 'Unauthorized. Only admins can feature games.' },
                    { status: 403 }
                )
            }
            updateData.featured = featured
        }

        if (playFee !== undefined) {
            const fee = Number(playFee)
            if (isNaN(fee) || fee < 0) {
                return NextResponse.json(
                    { error: 'Invalid play fee. Must be a positive number.' },
                    { status: 400 }
                )
            }
            updateData.playFee = playFee.toString()
        }

        const updatedGame = await prisma.game.update({
            where: { slug },
            data: updateData,
        })

        return NextResponse.json({
            success: true,
            data: {
                slug,
                private: updatedGame.private,
                playFee: updatedGame.playFee,
                featured: updatedGame.featured,
            },
        })

    } catch (error) {
        console.error('Settings update error:', error)
        return NextResponse.json({ error: 'Failed to update game settings' }, { status: 500 })
    }
}
