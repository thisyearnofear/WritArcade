import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getActor } from '@/services/auth'
import { ProductFunnelService } from '@/services/product-funnel.service'

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
})

export async function GET(request: NextRequest) {
  try {
    const actor = await getActor()
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    if (!actor.user.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    const report = await ProductFunnelService.getReport(query.days)

    return NextResponse.json({ success: true, data: report })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'days must be an integer between 1 and 90' }, { status: 400 })
    }

    console.error('[product-funnel] Failed to build report:', error)
    return NextResponse.json({ success: false, error: 'Failed to build funnel report' }, { status: 500 })
  }
}
