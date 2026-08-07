import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetActor = vi.fn()
const mockGetReport = vi.fn()

vi.mock('@/services/auth', () => ({
  getActor: (...args: unknown[]) => mockGetActor(...args),
}))

vi.mock('@/services/product-funnel.service', () => ({
  ProductFunnelService: {
    getReport: (...args: unknown[]) => mockGetReport(...args),
  },
}))

describe('GET /api/admin/analytics/funnel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetReport.mockResolvedValue({ events: {}, conversion: {}, expansion: {} })
  })

  it('requires authentication and admin access', async () => {
    const { GET } = await import('@/app/api/admin/analytics/funnel/route')

    mockGetActor.mockResolvedValue(null)
    let response = await GET(new Request('http://localhost/api/admin/analytics/funnel') as unknown as import('next/server').NextRequest)
    expect(response.status).toBe(401)

    mockGetActor.mockResolvedValue({ user: { isAdmin: false } })
    response = await GET(new Request('http://localhost/api/admin/analytics/funnel') as unknown as import('next/server').NextRequest)
    expect(response.status).toBe(403)
    expect(mockGetReport).not.toHaveBeenCalled()
  })

  it('returns a bounded report for an admin', async () => {
    mockGetActor.mockResolvedValue({ user: { isAdmin: true } })
    mockGetReport.mockResolvedValue({ window: { days: 14 }, events: { game_generated: 3 }, conversion: {}, expansion: {} })
    const { GET } = await import('@/app/api/admin/analytics/funnel/route')

    const response = await GET(new Request('http://localhost/api/admin/analytics/funnel?days=14') as unknown as import('next/server').NextRequest)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true, data: { window: { days: 14 }, events: { game_generated: 3 }, conversion: {}, expansion: {} } })
    expect(mockGetReport).toHaveBeenCalledWith(14)
  })

  it('rejects an unbounded date window', async () => {
    mockGetActor.mockResolvedValue({ user: { isAdmin: true } })
    const { GET } = await import('@/app/api/admin/analytics/funnel/route')

    const response = await GET(new Request('http://localhost/api/admin/analytics/funnel?days=91') as unknown as import('next/server').NextRequest)

    expect(response.status).toBe(400)
    expect(mockGetReport).not.toHaveBeenCalled()
  })
})
