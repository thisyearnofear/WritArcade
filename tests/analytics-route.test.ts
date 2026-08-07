import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockProductAnalyticsEventCreate = vi.fn()

vi.mock('@/lib/database', () => ({
  prisma: {
    productAnalyticsEvent: {
      create: (...args: unknown[]) => mockProductAnalyticsEventCreate(...args),
    },
  },
}))

describe('POST /api/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProductAnalyticsEventCreate.mockResolvedValue({ id: 'event-1' })
  })

  it('persists approved properties and strips sensitive/unapproved values', async () => {
    const { POST } = await import('@/app/api/analytics/route')
    const request = new Request('http://localhost:3000/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'article_preview_succeeded',
        properties: {
          mode: 'story',
          wordCount: 500,
          articlePreviewed: true,
          articleUrl: 'https://paragraph.xyz/private/article',
          walletAddress: '0x123',
          unknownField: 'drop me',
        },
        path: '/generate?url=https%3A%2F%2Fparagraph.xyz%2Fprivate%2Farticle',
        ts: '2026-08-07T12:00:00.000Z',
      }),
    })

    const response = await POST(request as unknown as import('next/server').NextRequest)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true, persisted: true })
    expect(mockProductAnalyticsEventCreate).toHaveBeenCalledWith({
      data: {
        event: 'article_preview_succeeded',
        properties: {
          mode: 'story',
          wordCount: 500,
          articlePreviewed: true,
        },
        path: '/generate',
      },
    })
  })

  it('rejects malformed and unknown events before persistence', async () => {
    const { POST } = await import('@/app/api/analytics/route')

    for (const event of ['', 'made_up_event']) {
      const request = new Request('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, properties: { mode: 'story' } }),
      })

      const response = await POST(request as unknown as import('next/server').NextRequest)

      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ success: false })
    }

    expect(mockProductAnalyticsEventCreate).not.toHaveBeenCalled()
  })

  it('truncates strings and removes query strings from paths', async () => {
    const { POST } = await import('@/app/api/analytics/route')
    const request = new Request('http://localhost:3000/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'share_clicked',
        properties: { surface: 'x'.repeat(250) },
        path: '/games/test?ref=private#share',
      }),
    })

    const response = await POST(request as unknown as import('next/server').NextRequest)

    expect(response.status).toBe(200)
    expect(mockProductAnalyticsEventCreate).toHaveBeenCalledWith({
      data: {
        event: 'share_clicked',
        properties: { surface: 'x'.repeat(200) },
        path: '/games/test',
      },
    })
  })

  it('returns accepted when analytics storage is unavailable', async () => {
    mockProductAnalyticsEventCreate.mockRejectedValue(new Error('database unavailable'))
    const { POST } = await import('@/app/api/analytics/route')
    const request = new Request('http://localhost:3000/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'game_generated', properties: { mode: 'story' } }),
    })

    const response = await POST(request as unknown as import('next/server').NextRequest)

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ success: true, persisted: false })
  })
})
