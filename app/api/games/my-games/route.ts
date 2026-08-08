import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { optionalAuth } from '@/services/auth'
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'
import { getWriterCoinById } from '@/lib/writer-coins'
import { ok, fail } from '@/lib/api-response'

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
    let wallet = searchParams.get('wallet')
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!wallet) {
      try {
        const maybeUser = await optionalAuth()
        if (maybeUser?.walletAddress) {
          wallet = maybeUser.walletAddress
        }
      } catch {
        // Silently handle auth errors - user remains unauthenticated
      }
    }

    if (!wallet) {
      return fail('Wallet address required')
    }

    // Validate wallet format
    if (!wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      return fail('Invalid wallet address format')
    }

    // Fetch user
    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: wallet, mode: 'insensitive' } },
    })

    if (!user) {
      return ok({
        wallet,
        games: [],
        total: 0,
        stats: {
          totalGames: 0,
          mintedGames: 0,
          totalPlaytime: 0,
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
    const mintedGames = games.filter((g) => g.nftTokenId).length
    const registeredGames = games.filter((g) => g.storyIpId).length
    const playedGames = games.filter((g) => g.playCount > 0).length

    const gameIds = games.map((g) => g.id)
    const dailySessions = gameIds.length
      ? await prisma.dailyChallengeSession.findMany({
          where: { gameId: { in: gameIds } },
          select: { gameId: true },
        })
      : []
    const dailyGameIds = new Set(dailySessions.map((s) => s.gameId))

    const formattedGames = await Promise.all(games.map(async (game) => {
      let writerMintReceipt: {
        writer: string
        writerShare: string
        symbol: string
      } | undefined

      if (game.nftTokenId && game.writerCoinId) {
        const coin = getWriterCoinById(game.writerCoinId)
        if (coin) {
          try {
            const distribution = await PaymentCostService.calculateDistribution(game.writerCoinId, 'mint-nft')
            const formatted = PaymentCostService.formatDistribution(distribution, coin.decimals, coin.symbol)
            writerMintReceipt = {
              writer: game.authorParagraphUsername || coin.writer,
              writerShare: formatted.writerShare,
              symbol: coin.symbol,
            }
          } catch {
            writerMintReceipt = undefined
          }
        }
      }

      return {
        id: game.id,
        slug: game.slug,
        title: game.title,
        description: game.description,
        tagline: game.tagline,
        genre: game.genre,
        subgenre: game.subgenre,
        primaryColor: game.primaryColor,
        mode: game.mode as 'story' | 'wordle' || 'story',
        promptName: game.promptName,
        promptText: game.promptText,
        promptModel: game.promptModel,
        articleUrl: game.articleUrl,
        articleContext: game.articleContext,
        writerCoinId: game.writerCoinId,
        difficulty: game.difficulty,
        creatorWallet: game.creatorWallet,
        authorWallet: game.authorWallet,
        authorParagraphUsername: game.authorParagraphUsername,
        publicationName: game.publicationName,
        publicationSummary: game.publicationSummary,
        subscriberCount: game.subscriberCount,
        articlePublishedAt: game.articlePublishedAt,
        imageUrl: game.imageUrl,
        imagePromptModel: game.imagePromptModel,
        imagePromptName: game.imagePromptName,
        imagePromptText: game.imagePromptText,
        imageData: game.imageData,
        musicPromptText: game.musicPromptText,
        musicPromptSeedImage: game.musicPromptSeedImage,
        nftTokenId: game.nftTokenId,
        nftTransactionHash: game.nftTransactionHash,
        nftMintedAt: game.nftMintedAt,
        writerMintReceipt,
        private: game.private,
        playFee: game.playFee,
        featured: game.featured ?? false,
        playCount: game.playCount ?? 0,
        lastPlayedAt: game.lastPlayedAt,
        promptVaultUuid: game.promptVaultUuid,
        wordleAnswerVaultUuid: game.wordleAnswerVaultUuid,
        secretPanelGenerated: game.secretPanelGenerated ?? false,
        storyIpId: game.storyIpId,
        superrareTokenId: game.superrareTokenId,
        hasDailySession: dailyGameIds.has(game.id),
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
      }
    }))

    return ok({
      wallet,
      games: formattedGames,
      total,
      limit,
      offset,
      stats: {
        totalGames: total,
        mintedGames,
        registeredGames,
        playedGames,
      },
    })
  } catch (error) {
    console.error('My games fetch error:', error)
    return fail('Failed to fetch games', 500)
  }
}
