import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { ANALYTICS_EVENT_NAMES } from '@/services/analytics'
import { z } from 'zod'

const analyticsSchema = z.object({
  event: z.enum(ANALYTICS_EVENT_NAMES),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  path: z.string().max(500).optional(),
  ts: z.string().optional(),
})

const SAFE_PROPERTY_KEYS = new Set([
  'surface',
  'channel',
  'mode',
  'paymentPath',
  'source',
  'writerCoinId',
  'articlePreviewed',
  'hasPaymentId',
  'wordCount',
  'estimatedReadTime',
  'genre',
  'difficulty',
  'loadingStep',
  'action',
  'network',
  'embedded',
  'panelIndex',
  'choiceIndex',
  'gameSlug',
])

function sanitizeProperties(
  properties?: Record<string, string | number | boolean | null>,
): Record<string, string | number | boolean | null> | undefined {
  if (!properties) return undefined

  const safeProperties = Object.entries(properties).reduce<Record<string, string | number | boolean | null>>(
    (result, [key, value]) => {
      if (!SAFE_PROPERTY_KEYS.has(key)) return result
      result[key] = typeof value === 'string' ? value.slice(0, 200) : value
      return result
    },
    {},
  )

  return Object.keys(safeProperties).length > 0 ? safeProperties : undefined
}

function sanitizePath(path?: string): string | undefined {
  if (!path) return undefined
  return path.split(/[?#]/, 1)[0].slice(0, 200)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const event = analyticsSchema.parse(body)
    const properties = sanitizeProperties(event.properties)

    const path = sanitizePath(event.path)

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[analytics:server]', { event: event.event, properties, path })
    }

    try {
      await prisma.productAnalyticsEvent.create({
        data: {
          event: event.event,
          properties,
          path,
        },
      })
    } catch (error) {
      // Analytics must never block creation, payment, or gameplay if storage is unavailable.
      console.error('[analytics:server] Failed to persist event:', error)
      return NextResponse.json({ success: true, persisted: false }, { status: 202 })
    }

    return NextResponse.json({ success: true, persisted: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }
}
