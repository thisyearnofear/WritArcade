import { NextRequest } from 'next/server'
import { ok, fail, notFound } from '@/lib/api-response'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { getGameProgress } from '@/lib/game-progress'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const game = await GameDatabaseService.getGameBySlug(slug)

    if (!game) {
      return notFound('Game not found')
    }

    const hasDailySession = Boolean(
      await prisma.dailyChallengeSession.findFirst({
        where: { gameId: game.id },
        select: { id: true },
      }),
    )

    const progress = getGameProgress({
      promptVaultUuid: game.promptVaultUuid,
      wordleAnswerVaultUuid: game.wordleAnswerVaultUuid,
      secretPanelGenerated: game.secretPanelGenerated,
      secretPanelCiphertext: game.secretPanelCiphertext,
      playCount: game.playCount,
      lastPlayedAt: game.lastPlayedAt,
      nftTokenId: game.nftTokenId,
      storyIpId: game.storyIpId,
      hasDailySession,
    })

    return ok({
      slug: game.slug,
      progress,
    })
  } catch (error) {
    console.error('Game progress fetch error:', error)
    return fail('Failed to fetch game progress', 500)
  }
}
