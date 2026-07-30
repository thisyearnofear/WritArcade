import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock actor resolution — identity must come from the session, not the body
const mockGetActor = vi.fn()
vi.mock('@/services/auth', () => ({
  getActor: () => mockGetActor(),
}))

// Mock prisma (spend route uses @/lib/prisma; funding service too)
const mockUserUpdate = vi.fn()
const mockCreditTxCreate = vi.fn()
const mockPaymentCreate = vi.fn()
const mockPaymentFindUnique = vi.fn()
const mockTransaction = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    user: { update: (...args: unknown[]) => mockUserUpdate(...args) },
    creditTransaction: { create: (...args: unknown[]) => mockCreditTxCreate(...args) },
    payment: {
      create: (...args: unknown[]) => mockPaymentCreate(...args),
      findUnique: (...args: unknown[]) => mockPaymentFindUnique(...args),
    },
  },
}))

import type { NextRequest } from 'next/server'
import { POST as spendPOST } from '@/app/api/credits/spend/route'
import { GameFundingService } from '@/domains/payments/services/game-funding.service'

const GUEST_USER = {
  id: 'user-guest-1',
  walletAddress: null,
  email: null,
  guestKey: 'gk_abc123',
  credits: 50,
}

const WALLET_USER = {
  id: 'user-wallet-1',
  walletAddress: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
  email: null,
  guestKey: null,
  credits: 50,
}

function makeRequest(body: unknown): NextRequest {
  return new Request('http://localhost:3000/api/credits/spend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

describe('POST /api/credits/spend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActor.mockResolvedValue(null)
    // $transaction resolves the ops in order: [userUpdate, creditTx, payment]
    mockTransaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops))
    mockUserUpdate.mockResolvedValue({ ...GUEST_USER, credits: 40 })
    mockCreditTxCreate.mockResolvedValue({ id: 'ctx-1' })
    mockPaymentCreate.mockResolvedValue({ id: 'pay-credits-1' })
  })

  it('returns 401 when there is no session actor', async () => {
    const res = await spendPOST(makeRequest({ action: 'generate-game' }))
    expect(res.status).toBe(401)
  })

  it('ignores a spoofed walletAddress in the body (identity from session only)', async () => {
    mockGetActor.mockResolvedValue({ user: GUEST_USER, identity: 'guest' })

    const res = await spendPOST(
      makeRequest({ action: 'generate-game', walletAddress: '0x' + 'e'.repeat(40) })
    )
    expect(res.status).toBe(200)

    const paymentData = mockPaymentCreate.mock.calls[0][0].data
    expect(paymentData.userId).toBe(GUEST_USER.id)
    expect(paymentData.walletAddress).toBeNull()
  })

  it('creates a verified credits Payment and returns its real paymentId', async () => {
    mockGetActor.mockResolvedValue({ user: WALLET_USER, identity: 'wallet' })
    const res = await spendPOST(makeRequest({ action: 'generate-game' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.paymentId).toBe('pay-credits-1')
    expect(body.data.creditsRemaining).toBe(40)

    const paymentData = mockPaymentCreate.mock.calls[0][0].data
    expect(paymentData.status).toBe('verified')
    expect(paymentData.writerCoinId).toBe('credits')
    expect(paymentData.action).toBe('generate-game')
    // Sentinel hash: never a real 0x tx hash
    expect(paymentData.transactionHash).toMatch(/^credits:[0-9a-f]{32}$/)
  })

  it('returns 402 when credits are insufficient', async () => {
    mockGetActor.mockResolvedValue({ user: { ...GUEST_USER, credits: 3 }, identity: 'guest' })
    const res = await spendPOST(makeRequest({ action: 'generate-game' }))
    expect(res.status).toBe(402)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns 400 for an unknown action', async () => {
    mockGetActor.mockResolvedValue({ user: GUEST_USER, identity: 'guest' })
    const res = await spendPOST(makeRequest({ action: 'delete-everything' }))
    expect(res.status).toBe(400)
  })
})

describe('GameFundingService credits funding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns credits_user context for a verified credits payment without wallet', async () => {
    mockPaymentFindUnique.mockResolvedValue({
      id: 'pay-credits-1',
      action: 'generate-game',
      status: 'verified',
      writerCoinId: 'credits',
      walletAddress: null,
      userId: GUEST_USER.id,
      user: { walletAddress: null },
    })

    const ctx = await GameFundingService.getVerifiedCreationPayment({ paymentId: 'pay-credits-1' })
    expect(ctx).toEqual(
      expect.objectContaining({
        paymentId: 'pay-credits-1',
        writerCoinId: 'credits',
        ownershipSource: 'credits_user',
        userId: GUEST_USER.id,
      })
    )
  })

  it('returns null for an unverified credits payment', async () => {
    mockPaymentFindUnique.mockResolvedValue({
      id: 'pay-credits-2',
      action: 'generate-game',
      status: 'pending',
      writerCoinId: 'credits',
      walletAddress: null,
      userId: GUEST_USER.id,
      user: { walletAddress: null },
    })

    const ctx = await GameFundingService.getVerifiedCreationPayment({ paymentId: 'pay-credits-2' })
    expect(ctx).toBeNull()
  })

  it('still requires a wallet for non-credits payments', async () => {
    mockPaymentFindUnique.mockResolvedValue({
      id: 'pay-coin-1',
      action: 'generate-game',
      status: 'verified',
      writerCoinId: 'some-writer-coin',
      walletAddress: null,
      userId: null,
      user: null,
    })

    const ctx = await GameFundingService.getVerifiedCreationPayment({ paymentId: 'pay-coin-1' })
    expect(ctx).toBeNull()
  })

  it('buildOwnership stamps credits_user ownership without inventing a wallet', () => {
    const ownership = GameFundingService.buildOwnership(
      {
        paymentId: 'pay-credits-1',
        writerCoinId: 'credits',
        walletAddress: null,
        userId: GUEST_USER.id,
        ownershipSource: 'credits_user',
      },
      {}
    )
    expect(ownership.ownershipSource).toBe('credits_user')
    expect(ownership.paymentId).toBe('pay-credits-1')
    expect(ownership.ownerWallet).toBeUndefined()
    expect(ownership.creatorWallet).toBeUndefined()
  })

  it('buildOwnership keeps the wallet for wallet-funded payments', () => {
    const ownership = GameFundingService.buildOwnership(
      {
        paymentId: 'pay-1',
        writerCoinId: 'some-writer-coin',
        walletAddress: WALLET_USER.walletAddress,
        ownershipSource: 'payment_wallet',
      },
      {}
    )
    expect(ownership.ownerWallet).toBe(WALLET_USER.walletAddress)
    expect(ownership.creatorWallet).toBe(WALLET_USER.walletAddress)
    expect(ownership.ownershipSource).toBe('payment_wallet')
  })
})
