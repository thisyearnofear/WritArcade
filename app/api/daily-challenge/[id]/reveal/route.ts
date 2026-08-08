import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { config, logger } from '@/lib/config'
import { getActor } from '@/services/auth'
import {
  DAILY_CHALLENGE_VAULT_ABI,
  createDailyChallengePublicClient,
  deriveDailyChallengeResult,
  getVaultAddress,
} from '@/lib/daily-challenge'

const SESSION_ID_PATTERN = /^0x[a-fA-F0-9]{64}$/

/**
 * POST /api/daily-challenge/[id]/reveal
 *
 * Records a revealed session only after verifying its owner and challenge day.
 * Score and modifiers are decrypted from authorized Inco handles by the server;
 * browser-supplied leaderboard values are intentionally ignored.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!config.features.dailyChallenge) {
      return NextResponse.json({ error: 'Daily challenge feature is not enabled' }, { status: 400 })
    }

    const actor = await getActor()
    const actorWallet = actor?.identity === 'wallet' ? actor.user.walletAddress?.toLowerCase() : null
    if (!actorWallet) {
      return NextResponse.json({ error: 'Wallet authentication is required' }, { status: 401 })
    }

    const { id: challengeId } = await params
    const body = await request.json()
    const { sessionId, gameId } = body as { sessionId?: unknown; gameId?: unknown }
    if (
      typeof sessionId !== 'string' ||
      !SESSION_ID_PATTERN.test(sessionId) ||
      typeof gameId !== 'string' ||
      gameId.length === 0
    ) {
      return NextResponse.json({ error: 'Invalid sessionId or gameId' }, { status: 400 })
    }

    const [challenge, game] = await Promise.all([
      prisma.dailyChallenge.findUnique({ where: { id: challengeId }, select: { day: true } }),
      prisma.game.findUnique({ where: { id: gameId }, select: { id: true } }),
    ])
    if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    const vaultAddress = getVaultAddress()
    const publicClient = await createDailyChallengePublicClient()
    const [sessionPlayer, sessionDay, revealedOnChain] = await Promise.all([
      publicClient.readContract({
        address: vaultAddress,
        abi: DAILY_CHALLENGE_VAULT_ABI,
        functionName: 'getSessionPlayer',
        args: [sessionId as `0x${string}`],
      }) as Promise<string>,
      publicClient.readContract({
        address: vaultAddress,
        abi: DAILY_CHALLENGE_VAULT_ABI,
        functionName: 'getSessionChallengeDay',
        args: [sessionId as `0x${string}`],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: vaultAddress,
        abi: DAILY_CHALLENGE_VAULT_ABI,
        functionName: 'isSessionRevealed',
        args: [sessionId as `0x${string}`],
      }) as Promise<boolean>,
    ])

    if (sessionPlayer.toLowerCase() !== actorWallet) {
      return NextResponse.json({ error: 'Authenticated wallet does not own this session' }, { status: 403 })
    }
    if (sessionDay !== BigInt(challenge.day)) {
      return NextResponse.json({ error: 'Session does not belong to this challenge' }, { status: 403 })
    }
    if (!revealedOnChain) {
      return NextResponse.json(
        { error: 'Session has not been revealed on-chain yet. Call completeAndReveal first.' },
        { status: 400 }
      )
    }

    const verifiedResult = await deriveDailyChallengeResult(sessionId as `0x${string}`)
    const { score, modifierIds } = verifiedResult

    const session = await prisma.dailyChallengeSession.upsert({
      where: { incoSessionId: sessionId },
      create: {
        challengeId,
        gameId,
        playerAddress: actorWallet,
        incoSessionId: sessionId,
        score,
        revealed: true,
        revealedModifierIds: modifierIds,
        revealedAt: new Date(),
      },
      update: {
        score,
        revealed: true,
        revealedModifierIds: modifierIds,
        revealedAt: new Date(),
      },
    })

    const higherScorers = await prisma.dailyChallengeSession.count({
      where: { challengeId, revealed: true, score: { gt: score } },
    })
    const rank = higherScorers + 1
    await prisma.dailyChallengeSession.update({ where: { id: session.id }, data: { rank } })

    const totalRevealed = await prisma.dailyChallengeSession.count({
      where: { challengeId, revealed: true },
    })

    logger.info('Daily challenge session revealed from verified on-chain result', {
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
      revealedModifierIds: modifierIds,
      rank,
      totalRevealed,
    })
  } catch (error) {
    console.error('Daily challenge reveal failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reveal session' },
      { status: 500 }
    )
  }
}

/** GET /api/daily-challenge/[id]/reveal — return a challenge leaderboard. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: challengeId } = await params
    const leaderboard = await prisma.dailyChallengeSession.findMany({
      where: { challengeId, revealed: true },
      orderBy: { score: 'desc' },
      take: 50,
      include: { game: { select: { title: true, slug: true } } },
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
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
