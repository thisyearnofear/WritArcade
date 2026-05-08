import { NextRequest, NextResponse } from 'next/server'
import { fetchWriterCoinBalance } from '@/domains/payments/services/writer-coin-balance.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')
    const coinId = searchParams.get('coin') || 'avc'

    const result = await fetchWriterCoinBalance(wallet || '', coinId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Balance API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch balance',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
