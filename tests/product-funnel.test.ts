import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGroupBy = vi.fn()

vi.mock('@/lib/database', () => ({
  prisma: {
    productAnalyticsEvent: {
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
    },
  },
}))

describe('ProductFunnelService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aggregates launch funnel events and calculates rates', async () => {
    mockGroupBy.mockResolvedValue([
      { event: 'article_preview_started', _count: { _all: 100 } },
      { event: 'article_preview_succeeded', _count: { _all: 80 } },
      { event: 'payment_started', _count: { _all: 50 } },
      { event: 'payment_succeeded', _count: { _all: 40 } },
      { event: 'game_generated', _count: { _all: 36 } },
      { event: 'play_clicked', _count: { _all: 30 } },
      { event: 'story_completed', _count: { _all: 15 } },
      { event: 'share_clicked', _count: { _all: 12 } },
      { event: 'ownership_clicked', _count: { _all: 5 } },
      { event: 'make_another_clicked', _count: { _all: 7 } },
      { event: 'unrelated_event', _count: { _all: 99 } },
    ])

    const { ProductFunnelService } = await import('@/services/product-funnel.service')
    const report = await ProductFunnelService.getReport(30, new Date('2026-08-07T12:00:00.000Z'))

    expect(report.events.article_preview_started).toBe(100)
    expect(report.events.game_generated).toBe(36)
    expect(report.events).not.toHaveProperty('unrelated_event')
    expect(report.conversion).toEqual({
      previewSuccessRate: 0.8,
      paymentSuccessRate: 0.8,
      generationFromPaymentRate: 0.9,
      playStartRate: 0.8333,
      completionRate: 0.5,
    })
    expect(report.expansion).toEqual({
      shareClicks: 12,
      ownershipClicks: 5,
      makeAnotherClicks: 7,
    })
    expect(report.window.start).toBe('2026-07-08T12:00:00.000Z')
  })

  it('returns null rates when a denominator has no events', async () => {
    mockGroupBy.mockResolvedValue([])

    const { ProductFunnelService } = await import('@/services/product-funnel.service')
    const report = await ProductFunnelService.getReport(7, new Date('2026-08-07T00:00:00.000Z'))

    expect(report.conversion).toEqual({
      previewSuccessRate: null,
      paymentSuccessRate: null,
      generationFromPaymentRate: null,
      playStartRate: null,
      completionRate: null,
    })
  })
})
