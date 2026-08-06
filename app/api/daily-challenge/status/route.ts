import { NextResponse } from 'next/server'
import { config } from '@/lib/config'
import {
  getBasePaintDay,
  getSessionManagerAddress,
  isDailyDeckShuffled,
  createDailyChallengePublicClient,
} from '@/lib/daily-challenge'

/**
 * GET /api/daily-challenge/status
 *
 * Public health check for daily challenge ops (no secrets exposed).
 */
export async function GET() {
  try {
    const day = getBasePaintDay()
    const managerAddress = await getSessionManagerAddress()
    let deckShuffled = false
    let managerBalanceEth: string | null = null

    try {
      deckShuffled = await isDailyDeckShuffled(day)
    } catch {
      deckShuffled = false
    }

    if (managerAddress) {
      try {
        const publicClient = await createDailyChallengePublicClient()
        const balance = await publicClient.getBalance({ address: managerAddress })
        managerBalanceEth = (Number(balance) / 1e18).toFixed(6)
      } catch {
        managerBalanceEth = null
      }
    }

    return NextResponse.json({
      enabled: config.features.dailyChallenge,
      day,
      deckShuffled,
      managerConfigured: Boolean(managerAddress),
      managerAddress,
      managerBalanceEth,
      ready: config.features.dailyChallenge && deckShuffled,
    })
  } catch (error) {
    console.error('Daily challenge status failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily challenge status' },
      { status: 500 }
    )
  }
}
