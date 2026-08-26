import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { streamAgenticPanel } from '@/domains/games/services/panel-agent.service'
import { refundAgentMediaCharge } from '@/domains/games/services/panel-agent.service'

describe('panel-agent.service', () => {
  const panel = {
    narrative: 'Maya reached the server room.',
    options: [
      { id: 1, text: 'Pull the breaker' },
      { id: 2, text: 'Call for backup' },
    ],
    traces: [],
    budget: { maxTokens: 4000, spent: 0 },
  }

  it('streams a panel as content → options → end', async () => {
    const events: string[] = []
    for await (const ev of streamAgenticPanel(panel)) {
      events.push(ev.type)
      if (ev.type === 'content') expect(ev.content).toBe(panel.narrative)
      if (ev.type === 'options') expect(ev.options).toHaveLength(2)
    }
    expect(events).toEqual(['content', 'options', 'end'])
  })

  it('emits only content + end when there are no options', async () => {
    const noOptions = { ...panel, options: [] }
    const types: string[] = []
    for await (const ev of streamAgenticPanel(noOptions)) types.push(ev.type)
    expect(types).toEqual(['content', 'end'])
  })
})

// Refund idempotency: gated on the additive agentMediaRefundedAt marker.
describe('refundAgentMediaCharge idempotency', () => {
  const tx = {
    game: { updateMany: vi.fn() },
    user: { update: vi.fn() },
    creditTransaction: { create: vi.fn() },
  }
  const prisma = { $transaction: vi.fn((fn) => fn(tx)) as never }

  beforeAll(() => {
    vi.doMock('@/lib/prisma', () => ({ prisma }))
  })
  afterEach(() => {
    tx.game.updateMany.mockReset()
    tx.user.update.mockReset()
    tx.creditTransaction.create.mockReset()
    vi.resetModules()
  })

  const charge = { paymentRef: '0xref', cost: 10, userId: 'user-1', slug: 'g', gameId: 'game-1' }

  it('returns false (no refund) when a concurrent run already refunded (marker set)', async () => {
    tx.game.updateMany.mockResolvedValue({ count: 0 })
    const result = await refundAgentMediaCharge(charge)
    expect(result).toBe(false)
    expect(tx.creditTransaction.create).not.toHaveBeenCalled()
  })

  it('refunds and credits exactly once when the marker is clear', async () => {
    tx.game.updateMany.mockResolvedValue({ count: 1 })
    tx.creditTransaction.create.mockResolvedValue({})
    const result = await refundAgentMediaCharge(charge)
    expect(result).toBe(true)
    expect(tx.creditTransaction.create).toHaveBeenCalledOnce()
  })

  it('refuses to refund when userId is missing', async () => {
    const result = await refundAgentMediaCharge({ ...charge, userId: null })
    expect(result).toBe(false)
    expect(tx.game.updateMany).not.toHaveBeenCalled()
  })
})

// Paid-panel charge: atomic spend + sentinel payment, gated by FEATURE_AGENT_PAID_PANELS.
describe('chargeAgentPanel', () => {
  const tx = {
    user: { updateMany: vi.fn() },
    creditTransaction: { create: vi.fn() },
    payment: { create: vi.fn() },
  }
  const prisma = { $transaction: vi.fn((fn) => fn(tx)) as never }
  const origFlag = process.env.FEATURE_AGENT_PAID_PANELS

  beforeAll(() => {
    vi.doMock('@/lib/prisma', () => ({ prisma }))
  })
  afterEach(() => {
    tx.user.updateMany.mockReset()
    tx.creditTransaction.create.mockReset()
    tx.payment.create.mockReset()
    vi.resetModules()
  })
  afterAll(() => {
    process.env.FEATURE_AGENT_PAID_PANELS = origFlag
  })

  it('returns null (no charge) when FEATURE_AGENT_PAID_PANELS is off', async () => {
    process.env.FEATURE_AGENT_PAID_PANELS = 'false'
    const { chargeAgentPanel } = await import('@/domains/games/services/panel-agent.service')
    const res = await chargeAgentPanel({ userId: 'user-1', gameId: 'game-1', slug: 'g' })
    expect(res).toBeNull()
    expect(tx.user.updateMany).not.toHaveBeenCalled()
  })

  it('returns mediaCharge after an atomic spend when enabled', async () => {
    process.env.FEATURE_AGENT_PAID_PANELS = 'true'
    tx.user.updateMany.mockResolvedValue({ count: 1 })
    tx.creditTransaction.create.mockResolvedValue({})
    tx.payment.create.mockResolvedValue({})
    const { chargeAgentPanel } = await import('@/domains/games/services/panel-agent.service')
    const res = await chargeAgentPanel({ userId: 'user-1', gameId: 'game-1', slug: 'g' })
    expect(res).not.toBeNull()
    expect(res?.paymentRef).toMatch(/^credits:/)
    expect(res!.cost).toBe(1)
    expect(tx.creditTransaction.create).toHaveBeenCalledOnce()
    expect(tx.payment.create).toHaveBeenCalledOnce()
  })

  it('returns null on insufficient balance (reserved.count === 0)', async () => {
    process.env.FEATURE_AGENT_PAID_PANELS = 'true'
    tx.user.updateMany.mockResolvedValue({ count: 0 })
    const { chargeAgentPanel } = await import('@/domains/games/services/panel-agent.service')
    const res = await chargeAgentPanel({ userId: 'user-1', gameId: 'game-1', slug: 'g' })
    expect(res).toBeNull()
    expect(tx.creditTransaction.create).not.toHaveBeenCalled()
  })
})