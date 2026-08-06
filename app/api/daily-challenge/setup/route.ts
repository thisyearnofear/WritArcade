import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { ensureDailyDeckShuffled, getBasePaintDay } from '@/lib/daily-challenge'

export const maxDuration = 60

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
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

    const result = await ensureDailyDeckShuffled(getBasePaintDay())
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
 * Manual ops trigger (requires CRON_SECRET). Creates today's on-chain challenge
 * and shuffles the deck when missing.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (!config.features.dailyChallenge) {
      return NextResponse.json({ error: 'Daily challenge feature is not enabled' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const day = typeof body.day === 'number' ? body.day : getBasePaintDay()
    const result = await ensureDailyDeckShuffled(day)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Daily challenge setup failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set up daily challenge' },
      { status: 500 }
    )
  }
}
