import { prisma } from '@/lib/database'

export const FUNNEL_EVENT_NAMES = [
  'article_preview_started',
  'article_preview_succeeded',
  'payment_started',
  'payment_succeeded',
  'game_generated',
  'play_clicked',
  'story_completed',
  'share_clicked',
  'ownership_clicked',
  'make_another_clicked',
] as const

export type FunnelEventName = typeof FUNNEL_EVENT_NAMES[number]

export interface ProductFunnelReport {
  window: {
    days: number
    start: string
    end: string
  }
  events: Record<FunnelEventName, number>
  /** Ratios of persisted event volumes, not unique-user/session conversion. */
  conversion: {
    previewSuccessRate: number | null
    paymentSuccessRate: number | null
    generationFromPaymentRate: number | null
    playStartRate: number | null
    completionRate: number | null
  }
  expansion: {
    shareClicks: number
    ownershipClicks: number
    makeAnotherClicks: number
  }
}

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Number((numerator / denominator).toFixed(4)) : null
}

export class ProductFunnelService {
  static async getReport(days: number, now = new Date()): Promise<ProductFunnelReport> {
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const rows = await prisma.productAnalyticsEvent.groupBy({
      by: ['event'],
      where: {
        occurredAt: {
          gte: start,
          lte: now,
        },
      },
      _count: { _all: true },
    })

    const events = Object.fromEntries(
      FUNNEL_EVENT_NAMES.map((event) => [event, 0]),
    ) as Record<FunnelEventName, number>

    for (const row of rows) {
      if (row.event in events) {
        events[row.event as FunnelEventName] = row._count._all
      }
    }

    return {
      window: {
        days,
        start: start.toISOString(),
        end: now.toISOString(),
      },
      events,
      conversion: {
        previewSuccessRate: rate(events.article_preview_succeeded, events.article_preview_started),
        paymentSuccessRate: rate(events.payment_succeeded, events.payment_started),
        generationFromPaymentRate: rate(events.game_generated, events.payment_succeeded),
        playStartRate: rate(events.play_clicked, events.game_generated),
        completionRate: rate(events.story_completed, events.play_clicked),
      },
      expansion: {
        shareClicks: events.share_clicked,
        ownershipClicks: events.ownership_clicked,
        makeAnotherClicks: events.make_another_clicked,
      },
    }
  }
}
