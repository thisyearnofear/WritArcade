import { NextRequest, NextResponse } from 'next/server'
import { config, logger } from '@/lib/config'
import {
  getBasePaintDay,
  getVaultAddress,
  DAILY_CHALLENGE_VAULT_ABI,
  createDailyChallengePublicClient,
  createSessionManagerWalletClient,
} from '@/lib/daily-challenge'
import { INCO_LIGHTNING_ABI, INCO_LIGHTNING_ADDRESS } from '@/lib/inco'

/** ETypes.Uint256 enum value in @inco/lightning Types.sol */
const ETYPE_UINT256 = 8

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

async function shuffleDailyDeck(day: number) {
  const vaultAddress = getVaultAddress()
  const publicClient = await createDailyChallengePublicClient()

  const stats = await publicClient.readContract({
    address: vaultAddress,
    abi: DAILY_CHALLENGE_VAULT_ABI,
    functionName: 'getChallengeStats',
    args: [BigInt(day)],
  }) as [bigint, bigint, boolean]

  const [, , deckShuffled] = stats
  if (deckShuffled) {
    return { success: true, day, alreadyShuffled: true as const }
  }

  const listFee = await publicClient.readContract({
    address: INCO_LIGHTNING_ADDRESS,
    abi: INCO_LIGHTNING_ABI,
    functionName: 'getEListFee',
    args: [52, ETYPE_UINT256],
  }) as bigint

  const walletClient = await createSessionManagerWalletClient()
  const [account] = await walletClient.getAddresses()

  const txHash = await walletClient.writeContract({
    address: vaultAddress,
    abi: DAILY_CHALLENGE_VAULT_ABI,
    functionName: 'createDailyChallenge',
    args: [BigInt(day)],
    value: listFee * 2n,
    account,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

  if (receipt.status !== 'success') {
    throw new Error('On-chain deck shuffle failed')
  }

  logger.info('Daily challenge deck shuffled on-chain', { day, txHash })

  return { success: true, day, txHash, alreadyShuffled: false as const }
}

/**
 * GET /api/daily-challenge/setup
 *
 * Vercel Cron entry point (see vercel.json). Requires CRON_SECRET bearer token.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (!config.features.dailyChallenge) {
      return NextResponse.json({ error: 'Daily challenge feature is not enabled' }, { status: 400 })
    }

    const result = await shuffleDailyDeck(getBasePaintDay())
    return NextResponse.json(result)
  } catch (error) {
    console.error('Daily challenge cron setup failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set up daily challenge' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/daily-challenge/setup
 *
 * Manual or ops trigger. Creates today's on-chain daily challenge and shuffles the deck.
 * Requires a server wallet with SESSION_MANAGER_ROLE.
 */
export async function POST(request: NextRequest) {
  try {
    if (!config.features.dailyChallenge) {
      return NextResponse.json({ error: 'Daily challenge feature is not enabled' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const day = typeof body.day === 'number' ? body.day : getBasePaintDay()
    const result = await shuffleDailyDeck(day)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Daily challenge setup failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set up daily challenge' },
      { status: 500 }
    )
  }
}
