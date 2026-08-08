import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { config, logger } from '@/lib/config'
import { getActor } from '@/services/auth'
import {
  DAILY_CHALLENGE_VAULT_ABI,
  createDailyChallengePublicClient,
  createSessionManagerWalletClient,
  getVaultAddress,
} from '@/lib/daily-challenge'

const SESSION_ID_PATTERN = /^0x[a-fA-F0-9]{64}$/

/**
 * POST /api/daily-challenge/[id]/record-choice
 *
 * Relays a panel choice using the SESSION_MANAGER_ROLE only after binding the
 * route challenge and the on-chain session to the authenticated wallet. This
 * prevents a public session ID from being used to advance another player.
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
    const { sessionId, panelIndex, choiceIndex } = body as {
      sessionId?: unknown
      panelIndex?: unknown
      choiceIndex?: unknown
    }

    if (
      typeof sessionId !== 'string' ||
      !SESSION_ID_PATTERN.test(sessionId) ||
      typeof panelIndex !== 'number' ||
      !Number.isInteger(panelIndex) ||
      typeof choiceIndex !== 'number' ||
      !Number.isInteger(choiceIndex)
    ) {
      return NextResponse.json({ error: 'Invalid sessionId, panelIndex, or choiceIndex' }, { status: 400 })
    }
    if (panelIndex < 0 || panelIndex > 4 || choiceIndex < 0 || choiceIndex > 3) {
      return NextResponse.json({ error: 'Invalid panelIndex or choiceIndex' }, { status: 400 })
    }

    const challenge = await prisma.dailyChallenge.findUnique({
      where: { id: challengeId },
      select: { day: true },
    })
    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    const vaultAddress = getVaultAddress()
    const publicClient = await createDailyChallengePublicClient()
    const [sessionPlayer, sessionDay] = await Promise.all([
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
    ])

    if (sessionPlayer.toLowerCase() !== actorWallet) {
      return NextResponse.json({ error: 'Authenticated wallet does not own this session' }, { status: 403 })
    }
    if (sessionDay !== BigInt(challenge.day)) {
      return NextResponse.json({ error: 'Session does not belong to this challenge' }, { status: 403 })
    }

    const walletClient = await createSessionManagerWalletClient()
    const [account] = await walletClient.getAddresses()
    const txHash = await walletClient.writeContract({
      address: vaultAddress,
      abi: DAILY_CHALLENGE_VAULT_ABI,
      functionName: 'recordChoice',
      args: [sessionId as `0x${string}`, panelIndex, choiceIndex],
      account,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'On-chain recordChoice failed' }, { status: 500 })
    }

    logger.info('Daily challenge choice recorded on-chain', {
      challengeId,
      sessionId,
      panelIndex,
      choiceIndex,
      txHash,
    })

    return NextResponse.json({ success: true, sessionId, panelIndex, choiceIndex, txHash })
  } catch (error) {
    console.error('Daily challenge record-choice failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record choice' },
      { status: 500 }
    )
  }
}
