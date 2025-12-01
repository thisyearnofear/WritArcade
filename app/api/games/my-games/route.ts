import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/games/my-games
 * Fetch all games created by the authenticated user
 * 
 * Query params:
 * - wallet: string (user's wallet address)
 * - limit: number (default 20)
 * - offset: number (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address required' },
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

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json({
        success: true,
        data: {
          wallet,
          games: [],
          total: 0,
          stats: {
            totalGames: 0,
            mintedGames: 0,
            totalPlaytime: 0,
          },
        },
      })
    }

    // Fetch user's games
    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.game.count({
        where: { userId: user.id },
      }),
    ])

    // Calculate stats
    const mintedGames = games.filter((g: any) => g.nftTokenId).length

    const formattedGames = games.map((game: any) => ({
      id: game.id,
      slug: game.slug,
      title: game.title,
      genre: game.genre,
      difficulty: game.difficulty,
      imageUrl: game.imageUrl,
      private: game.private,
      createdAt: game.createdAt,
      nftTokenId: game.nftTokenId,
      nftMintedAt: game.nftMintedAt,
    }))

    return NextResponse.json({
      success: true,
      data: {
        wallet,
        games: formattedGames,
        total,
        limit,
        offset,
        stats: {
          totalGames: total,
          mintedGames,
        },
      },
    })
  } catch (error) {
    console.error('My games fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
