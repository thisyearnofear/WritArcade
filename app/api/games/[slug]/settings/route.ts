import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/constants'
import { authorizeGameOwner, isWalletAddress } from '@/domains/games/services/game-ownership.service'

/**
 * PATCH /api/games/[slug]/settings
 * Update game settings (play fee, visibility, featured status)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const body = await request.json()
        const { playFee, private: isPrivate, featured, wallet } = body

        if (!wallet) {
            return NextResponse.json(
                { error: 'Wallet address is required for verification' },
                { status: 400 }
            )
        }

        if (!isWalletAddress(wallet)) {
            return NextResponse.json(
                { error: 'Invalid wallet address format' },
                { status: 400 }
            )
        }

        // Get current game to verify ownership
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

        // Verify ownership or Admin status
        const ownership = authorizeGameOwner({ game, wallet })
        const isOwner = ownership.authorized
        const isUserAdmin = isAdmin(wallet)

        if (!isOwner && !isUserAdmin) {
            return NextResponse.json(
                { error: 'Unauthorized. Only the owner or an admin can update settings.' },
                { status: 403 }
            )
        }

        const updateData: Record<string, unknown> = {}

        // Privacy toggle (Owner or Admin)
        if (typeof isPrivate === 'boolean') {
            updateData.private = isPrivate
        }

        // Featured toggle (Admin Only)
        // IMPORTANT: Verify Admin again explicitly for this field
        if (typeof featured === 'boolean') {
            if (!isUserAdmin) {
                // Silently ignore or throw 403? 
                // Throwing 403 is safer to prevent hacking
                return NextResponse.json(
                    { error: 'Unauthorized. Only admins can feature games.' },
                    { status: 403 }
                )
            }
            updateData.featured = featured
        }

        // Play Fee (Owner or Admin)
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

        // Update game
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
                featured: updatedGame.featured
            },
        })

    } catch (error) {
        console.error('Settings update error:', error)
        return NextResponse.json(
            { error: 'Failed to update game settings' },
            { status: 500 }
        )
    }
}
