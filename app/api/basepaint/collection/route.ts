import { NextRequest, NextResponse } from 'next/server'
import { fetchBasePaintOwnedCanvases, fetchGamesForBasePaintDay } from '@/lib/basepaint'

/**
 * GET /api/basepaint/collection?address=0x...
 */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim()
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Valid address query param required' }, { status: 400 })
  }

  try {
    const owned = await fetchBasePaintOwnedCanvases(address)
    const entries = await Promise.all(
      owned.slice(0, 24).map(async (canvas) => {
        const games = await fetchGamesForBasePaintDay(canvas.day, 3)
        return { ...canvas, games }
      })
    )

    return NextResponse.json({ address, canvases: entries, totalOwned: owned.length })
  } catch (error) {
    console.error('[BasePaint] collection failed:', error)
    return NextResponse.json({ error: 'Failed to load collection' }, { status: 500 })
  }
}
