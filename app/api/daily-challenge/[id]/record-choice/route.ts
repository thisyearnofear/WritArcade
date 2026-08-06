import { NextRequest, NextResponse } from 'next/server'
import { config, logger } from '@/lib/config'
import {
  DAILY_CHALLENGE_VAULT_ABI,
  createDailyChallengePublicClient,
  createSessionManagerWalletClient,
  getVaultAddress,
} from '@/lib/daily-challenge'

/**
 * POST /api/daily-challenge/[id]/record-choice
 *
 * Records a player's panel choice on-chain via DailyChallengeVault.recordChoice().
 * Called by the frontend after each panel's AI generation completes.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!config.features.dailyChallenge) {
      return NextResponse.json({ error: 'Daily challenge feature is not enabled' }, { status: 400 })
    }

    const { id: _challengeId } = await params
    const body = await request.json()
    const { sessionId, panelIndex, choiceIndex } = body as {
      sessionId?: string
      panelIndex?: number
      choiceIndex?: number
    }

    if (!sessionId || panelIndex === undefined || choiceIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, panelIndex, choiceIndex' },
        { status: 400 }
      )
    }

    if (panelIndex < 0 || panelIndex > 4 || choiceIndex < 0 || choiceIndex > 3) {
      return NextResponse.json({ error: 'Invalid panelIndex or choiceIndex' }, { status: 400 })
    }

    const vaultAddress = getVaultAddress()
    const walletClient = await createSessionManagerWalletClient()
    const [account] = await walletClient.getAddresses()
    const publicClient = await createDailyChallengePublicClient()

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
      sessionId,
      panelIndex,
      choiceIndex,
      txHash,
    })

    return NextResponse.json({
      success: true,
      sessionId,
      panelIndex,
      choiceIndex,
      txHash,
    })
  } catch (error) {
    console.error('Daily challenge record-choice failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record choice' },
      { status: 500 }
    )
  }
}
