import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const analyticsSchema = z.object({
  event: z.string().min(1).max(120),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  path: z.string().max(500).optional(),
  ts: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const event = analyticsSchema.parse(body)

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[analytics:server]', event)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }
}
