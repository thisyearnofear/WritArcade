import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mockGetActor = vi.fn()
const mockChallengeFindUnique = vi.fn()
const mockGameFindUnique = vi.fn()
const mockSessionUpsert = vi.fn()
const mockSessionCount = vi.fn()
const mockSessionUpdate = vi.fn()
const mockReadContract = vi.fn()
const mockWaitForTransactionReceipt = vi.fn()
const mockWriteContract = vi.fn()
const mockGetAddresses = vi.fn()
const mockDeriveDailyChallengeResult = vi.fn()

vi.mock('@/services/auth', () => ({ getActor: () => mockGetActor() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    dailyChallenge: { findUnique: (...args: unknown[]) => mockChallengeFindUnique(...args) },
    game: { findUnique: (...args: unknown[]) => mockGameFindUnique(...args) },
    dailyChallengeSession: {
      upsert: (...args: unknown[]) => mockSessionUpsert(...args),
      count: (...args: unknown[]) => mockSessionCount(...args),
      update: (...args: unknown[]) => mockSessionUpdate(...args),
      findMany: vi.fn(),
    },
  },
}))
vi.mock('@/lib/config', () => ({
  config: { features: { dailyChallenge: true } },
  logger: { info: vi.fn() },
}))
vi.mock('@/lib/daily-challenge', () => ({
  DAILY_CHALLENGE_VAULT_ABI: [],
  getVaultAddress: () => '0x0000000000000000000000000000000000000001',
  createDailyChallengePublicClient: () => ({
    readContract: (...args: unknown[]) => mockReadContract(...args),
    waitForTransactionReceipt: (...args: unknown[]) => mockWaitForTransactionReceipt(...args),
  }),
  createSessionManagerWalletClient: () => ({
    getAddresses: (...args: unknown[]) => mockGetAddresses(...args),
    writeContract: (...args: unknown[]) => mockWriteContract(...args),
  }),
  deriveDailyChallengeResult: (...args: unknown[]) => mockDeriveDailyChallengeResult(...args),
}))

import { POST as recordChoice } from '@/app/api/daily-challenge/[id]/record-choice/route'
import { POST as reveal } from '@/app/api/daily-challenge/[id]/reveal/route'

const PLAYER = '0x1111111111111111111111111111111111111111'
const OTHER_PLAYER = '0x2222222222222222222222222222222222222222'
const SESSION_ID = `0x${'a'.repeat(64)}`

function request(body: unknown): NextRequest {
  return new Request('http://localhost/api/daily-challenge/challenge-1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest
}

function routeParams() {
  return { params: Promise.resolve({ id: 'challenge-1' }) }
}

function mockWalletActor(walletAddress = PLAYER) {
  mockGetActor.mockResolvedValue({ user: { walletAddress }, identity: 'wallet' })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockChallengeFindUnique.mockResolvedValue({ day: 321 })
  mockGameFindUnique.mockResolvedValue({ id: 'game-1' })
  mockReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
    if (functionName === 'getSessionPlayer') return Promise.resolve(PLAYER)
    if (functionName === 'getSessionChallengeDay') return Promise.resolve(321n)
    if (functionName === 'isSessionRevealed') return Promise.resolve(true)
    throw new Error(`Unexpected read: ${functionName}`)
  })
  mockGetAddresses.mockResolvedValue([PLAYER])
  mockWriteContract.mockResolvedValue('0xtx')
  mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' })
  mockSessionUpsert.mockResolvedValue({ id: 'session-row-1' })
  mockSessionCount.mockResolvedValue(0)
  mockSessionUpdate.mockResolvedValue({})
  mockDeriveDailyChallengeResult.mockResolvedValue({ score: 20, modifierIds: [52, 1, 2, 3, 4] })
})

describe('POST /api/daily-challenge/[id]/record-choice', () => {
  it('requires the authenticated wallet to own the session before using the manager wallet', async () => {
    mockWalletActor(OTHER_PLAYER)

    const response = await recordChoice(
      request({ sessionId: SESSION_ID, panelIndex: 0, choiceIndex: 0 }),
      routeParams()
    )

    expect(response.status).toBe(403)
    expect(mockWriteContract).not.toHaveBeenCalled()
  })

  it('rejects a session from a different on-chain challenge day', async () => {
    mockWalletActor()
    mockReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'getSessionPlayer') return Promise.resolve(PLAYER)
      if (functionName === 'getSessionChallengeDay') return Promise.resolve(322n)
      throw new Error(`Unexpected read: ${functionName}`)
    })

    const response = await recordChoice(
      request({ sessionId: SESSION_ID, panelIndex: 0, choiceIndex: 0 }),
      routeParams()
    )

    expect(response.status).toBe(403)
    expect(mockWriteContract).not.toHaveBeenCalled()
  })

  it('relays an owned session for the matching challenge', async () => {
    mockWalletActor()

    const response = await recordChoice(
      request({ sessionId: SESSION_ID, panelIndex: 0, choiceIndex: 3 }),
      routeParams()
    )

    expect(response.status).toBe(200)
    expect(mockWriteContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'recordChoice',
      args: [SESSION_ID, 0, 3],
    }))
  })
})

describe('POST /api/daily-challenge/[id]/reveal', () => {
  it('persists server-derived score and modifiers instead of spoofed request values', async () => {
    mockWalletActor()

    const response = await reveal(
      request({
        sessionId: SESSION_ID,
        gameId: 'game-1',
        score: 50,
        revealedModifierIds: [1, 1, 1, 1, 1],
        playerAddress: OTHER_PLAYER,
      }),
      routeParams()
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockDeriveDailyChallengeResult).toHaveBeenCalledWith(SESSION_ID)
    expect(mockSessionUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        playerAddress: PLAYER,
        score: 20,
        revealedModifierIds: [52, 1, 2, 3, 4],
      }),
      update: expect.objectContaining({
        score: 20,
        revealedModifierIds: [52, 1, 2, 3, 4],
      }),
    }))
    expect(body).toMatchObject({ score: 20, revealedModifierIds: [52, 1, 2, 3, 4] })
  })
})
