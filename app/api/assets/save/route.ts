import { NextRequest, NextResponse } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { optionalAuth } from '@/services/auth'
import { z } from 'zod'

// Validation Schema
const saveAssetSchema = z.object({
    title: z.string(),
    description: z.string(),
    content: z.object({
        title: z.string(),
        description: z.string(),
        characters: z.array(z.any()),
        storyBeats: z.array(z.any()),
        gameMechanics: z.array(z.any()),
        visualGuidelines: z.any()
    }),
    articleUrl: z.string().optional(),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate basic structure
        const validated = saveAssetSchema.parse(body)

        // Get User (Optional)
        const user = await optionalAuth()

        const asset = await GameDatabaseService.saveAssetPack({
            ...validated,
            creatorId: user?.walletAddress || undefined // Use wallet as mock ID if no full user
        })

        return NextResponse.json({
            success: true,
            data: {
                id: asset.id,
                title: asset.title
            }
        })

    } catch (error) {
        console.error('Save asset error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to save asset pack' },
            { status: 500 }
        )
    }
}