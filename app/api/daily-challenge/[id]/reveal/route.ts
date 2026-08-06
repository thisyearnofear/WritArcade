import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { config, logger } from '@/lib/config'
import { getActor } from '@/services/auth'
import {
  DAILY_CHALLENGE_VAULT_ABI,
  createDailyChallengePublicClient,
  getVaultAddress,
} from '@/lib/daily-challenge'

/**
 * POST /api/daily-challenge/[id]/reveal
 *
 * Called at the game finale. Records the player's revealed score and modifiers
 * in the database for the leaderboard.
 *
 * The actual on-chain reveal (e.reveal) is called by the player's wallet
 * via the DailyChallengeVault contract. This endpoint records the result.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!config.features.dailyChallenge) {
      return NextResponse.json({ error: 'Daily challenge feature is not enabled' }, { status: 400 })
    }

    const { id: challengeId } = await params
    const body = await request.json()
    const { sessionId, gameId, score, revealedModifierIds, playerAddress } = body as {
      sessionId: string
      gameId: string
      score: number
      revealedModifierIds: number[]
      playerAddress: string
    }

    if (!sessionId || !gameId || score === undefined || !playerAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, gameId, score, playerAddress' },
        { status: 400 }
      )
    }

    const actor = await getActor()
    const actorWallet = actor?.user?.walletAddress?.toLowerCase()

    const vaultAddress = getVaultAddress()
    const publicClient = await createDailyChallengePublicClient()

    const sessionPlayer = await publicClient.readContract({
      address: vaultAddress,
      abi: DAILY_CHALLENGE_VAULT_ABI,
      functionName: 'getSessionPlayer',
      args: [sessionId as `0x${string}`],
    }) as string

    const normalizedPlayer = playerAddress.toLowerCase()
    const onChainPlayer = sessionPlayer.toLowerCase()

    if (onChainPlayer !== normalizedPlayer) {
      return NextResponse.json(
        { error: 'playerAddress does not match on-chain session owner' },
        { status: 403 }
      )
    }

    if (actorWallet && actorWallet !== normalizedPlayer) {
      return NextResponse.json(
        { error: 'Authenticated wallet does not match session owner' },
        { status: 401 }
      )
    }

    const revealedOnChain = await publicClient.readContract({
      address: vaultAddress,
      abi: DAILY_CHALLENGE_VAULT_ABI,
      functionName: 'isSessionRevealed',
      args: [sessionId as `0x${string}`],
    })

    if (!revealedOnChain) {
      return NextResponse.json(
        { error: 'Session has not been revealed on-chain yet. Call completeAndReveal first.' },
        { status: 400 }
      )
    }

    // Verify the challenge exists
    const challenge = await prisma.dailyChallenge.findUnique({
      where: { id: challengeId },
    })

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Record the session result
    const session = await prisma.dailyChallengeSession.upsert({
      where: { incoSessionId: sessionId },
      create: {
        challengeId,
        gameId,
        playerAddress: playerAddress.toLowerCase(),
        incoSessionId: sessionId,
        score,
        revealed: true,
        revealedModifierIds: revealedModifierIds,
        revealedAt: new Date(),
      },
      update: {
        score,
        revealed: true,
        revealedModifierIds: revealedModifierIds,
        revealedAt: new Date(),
      },
    })

    // Compute rank
    const higherScorers = await prisma.dailyChallengeSession.count({
      where: {
        challengeId,
        revealed: true,
        score: { gt: score },
      },
    })

    const rank = higherScorers + 1

    await prisma.dailyChallengeSession.update({
      where: { id: session.id },
      data: { rank },
    })

    logger.info('Daily challenge session revealed', {
      challengeId,
      sessionId,
      gameId,
      score,
      rank,
    })

    return NextResponse.json({
      success: true,
      sessionId,
      score,
      rank,
      totalRevealed: (await prisma.dailyChallengeSession.count({
        where: { challengeId, revealed: true },
      })) + 0,
    })
  } catch (error) {
    console.error('Daily challenge reveal failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reveal session' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/daily-challenge/[id]/reveal
 *
 * Returns the leaderboard for a specific challenge.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: challengeId } = await params

    const leaderboard = await prisma.dailyChallengeSession.findMany({
      where: {
        challengeId,
        revealed: true,
      },
      orderBy: { score: 'desc' },
      take: 50,
      include: {
        game: { select: { title: true, slug: true } },
      },
    })

    return NextResponse.json({
      challengeId,
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        playerAddress: entry.playerAddress,
        score: entry.score,
        gameTitle: entry.game?.title,
        gameSlug: entry.game?.slug,
        revealedAt: entry.revealedAt,
        modifierIds: entry.revealedModifierIds,
      })),
    })
  } catch (error) {
    console.error('Leaderboard fetch failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
