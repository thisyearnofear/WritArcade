import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockVerifySignature = vi.fn()
vi.mock('@/lib/integrations/etherfuse', () => ({
  verifyWebhookSignature: (...args: unknown[]) => mockVerifySignature(...args),
}))

const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()
const mockUserUpdate = vi.fn()
const mockTx = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    creditTransaction: { findFirst: (...a: unknown[]) => mockFindFirst(...a), update: (...a: unknown[]) => mockUpdate(...a) },
    user: { update: (...a: unknown[]) => mockUserUpdate(...a) },
    $transaction: (...a: unknown[]) => mockTx(...a),
  },
}))

import type { NextRequest } from 'next/server'
import { POST } from '@/app/api/ramp/webhook/route'

function makeRequest(orderId: string, event = 'order.completed'): NextRequest {
  return new Request('http://localhost:3000/api/ramp/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-etherfuse-signature': 'sig' },
    body: JSON.stringify({ event, orderId }),
  }) as unknown as NextRequest
}

describe('POST /api/ramp/webhook — replay guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifySignature.mockResolvedValue(true)
  })

  it('rejects an invalid signature', async () => {
    mockVerifySignature.mockResolvedValue(false)
    const res = await POST(makeRequest('o-1'))
    expect(res.status).toBe(401)
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('does not double-credit when an order.completed is replayed', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'ct-1',
      etherfuseOrderId: 'o-1',
      status: 'completed', // already credited
      creditAmount: 100,
      userId: 'u1',
    })
    const res = await POST(makeRequest('o-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.idempotent).toBe(true)
    expect(mockTx).not.toHaveBeenCalled()
    expect(mockUserUpdate).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('credits a pending order.completed once', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'ct-1',
      etherfuseOrderId: 'o-1',
      status: 'pending',
      creditAmount: 100,
      userId: 'u1',
      user: { id: 'u1' },
    })
    // Route uses the array form of $transaction.
    mockTx.mockResolvedValue([])
    const res = await POST(makeRequest('o-1'))
    expect(res.status).toBe(200)
    expect(mockUserUpdate).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('returns 404 for an unknown order', async () => {
    mockFindFirst.mockResolvedValue(null)
    const res = await POST(makeRequest('o-unknown'))
    expect(res.status).toBe(404)
  })
})