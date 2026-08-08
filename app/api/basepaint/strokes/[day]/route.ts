import { NextRequest, NextResponse } from 'next/server'
import { fetchBasePaintStrokeBundle } from '@/lib/basepaint'

/**
 * GET /api/basepaint/strokes/[day]
 * On-chain stroke data for client replay (cached server-side).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ day: string }> }
) {
  try {
    const { day: dayParam } = await params
    const day = parseInt(dayParam, 10)
    if (!Number.isFinite(day) || day < 1) {
      return NextResponse.json({ error: 'Invalid day' }, { status: 400 })
    }

    const bundle = await fetchBasePaintStrokeBundle(day)
    if (!bundle) {
      return NextResponse.json({ error: 'Strokes not found' }, { status: 404 })
    }

    return NextResponse.json(bundle, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (error) {
    console.error('[BasePaint] strokes API failed:', error)
    return NextResponse.json({ error: 'Failed to load strokes' }, { status: 500 })
  }
}
