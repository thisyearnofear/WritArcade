import { NextRequest, NextResponse } from 'next/server'
import { AssetMarketplaceService } from '@/domains/assets/services/asset-marketplace.service'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { AssetDatabaseService } from '@/domains/assets/services/asset-database.service'
import { prisma } from '@/lib/database'

/**
 * POST /api/assets/build-game
 * 
 * Create a game by composing multiple assets together
 * 
 * Body:
 * {
 *   assetIds: string[]
 *   customization?: {
 *     title?: string
 *     description?: string
 *     genre?: string
 *   }
 *   userId?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assetIds, customization, userId } = body

    // Validate input
    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one asset ID is required' },
        { status: 400 }
      )
    }

    // Compose game from assets
    const composed = await AssetMarketplaceService.composeGameFromAssets(
      assetIds,
      customization
    )

    if (!composed) {
      return NextResponse.json(
        { error: 'Failed to compose game from assets' },
        { status: 500 }
      )
    }

    // Save game to database
    const savedGame = await GameDatabaseService.createGame(
      {
        title: composed.game.title,
        description: composed.game.description,
        tagline: composed.game.tagline,
        genre: composed.game.genre,
        subgenre: composed.game.subgenre,
        primaryColor: composed.game.primaryColor || '#3b82f6',
        promptModel: composed.game.promptModel,
        promptName: composed.game.promptName,
        promptText: composed.game.promptText,
        creatorWallet: composed.game.creatorWallet,
      },
      userId
    )

    // Create GameFromAsset records for attribution tracking
    const gameFromAssetRecords = await Promise.all(
      assetIds.map((assetId) =>
        prisma.gameFromAsset.create({
          data: {
            gameId: savedGame.id,
            assetId,
            userId: userId || 'anonymous',
            compositionPrompt: composed.game.promptText || '',
            tokensSpent: 0, // Will be updated when payment is processed
          },
        })
      )
    )

    // Initialize AssetRevenue records for future royalty distribution
    const assetRevenues = await Promise.all(
      assetIds.map(async (assetId) => {
        const asset = await AssetDatabaseService.getAssetById(assetId)
        
        if (!asset || !asset.creatorId) {
          return null
        }

        return prisma.assetRevenue.create({
          data: {
            assetId,
            gameId: savedGame.id,
            creatorId: asset.creatorId,
            amount: BigInt(0), // Will be updated when game generates revenue
            status: 'pending',
          },
        })
      })
    )

    return NextResponse.json({
      success: true,
      game: savedGame,
      assetCount: assetIds.length,
      gameFromAssets: gameFromAssetRecords,
      revenueTracking: assetRevenues.filter((r) => r !== null),
      message: `Game created from ${assetIds.length} assets. Revenue tracking initialized.`,
    })
  } catch (error) {
    console.error('Game composition error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/assets/build-game
 * 
 * Get games created from assets with filtering
 * 
 * Query:
 * - userId?: string
 * - limit?: number
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '25')

    const where: any = {}
    if (userId) {
      where.userId = userId
    }

    // Get games that were created from assets
    const games = await prisma.gameFromAsset.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Enrich with full game data
    const enrichedGames = await Promise.all(
      games.map(async (gfa) => {
        const game = await prisma.game.findUnique({
          where: { id: gfa.gameId },
        })
        return {
          gameFromAsset: gfa,
          game,
        }
      })
    )

    return NextResponse.json({
      success: true,
      games: enrichedGames,
      total: enrichedGames.length,
    })
  } catch (error) {
    console.error('Game retrieval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
