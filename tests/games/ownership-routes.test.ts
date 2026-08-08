import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetActor = vi.fn()
vi.mock('@/services/auth', () => ({ getActor: () => mockGetActor() }))

const mockFindUnique = vi.fn()
const mockDelete = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    game: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}))

import type { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/games/[slug]/delete/route'

const OWNER = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
const OTHER = '0x' + 'b'.repeat(40)
const SLUG = 'my-game'

const ownedGame = {
  slug: SLUG,
  ownerWallet: OWNER,
  nftTokenId: null,
  user: { walletAddress: OWNER },
  payment: null,
  creatorWallet: null,
}

function makeRequest(): NextRequest {
  return new Request(`http://localhost:3000/api/games/${SLUG}/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: OWNER }),
  }) as unknown as NextRequest
}

function walletActor(address = OWNER) {
  return { identity: 'wallet', user: { id: 'u1', walletAddress: address } }
}

describe('DELETE /api/games/[slug]/delete — ownership hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue(ownedGame)
    mockDelete.mockResolvedValue({}) // widened return
  })

  it('rejects supplying the real owner public address without a session', async () => {
    mockGetActor.mockResolvedValue(null)
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ slug: SLUG }) })
    // The caller knows the owner's address (sent in the body), but with no
    // authenticated session this must be rejected.
    expect(res.status).toBe(401)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('rejects a non-wallet session identity (email) even with the owner address', async () => {
    mockGetActor.mockResolvedValue({ identity: 'email', user: { id: 'u9', walletAddress: null } })
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ slug: SLUG }) })
    expect(res.status).toBe(401)
  })

  it('rejects an authenticated non-owner wallet', async () => {
    mockGetActor.mockResolvedValue(walletActor(OTHER))
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ slug: SLUG }) })
    expect(res.status).toBe(403)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('allows the authenticated owner to delete', async () => {
    mockGetActor.mockResolvedValue(walletActor(OWNER))
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ slug: SLUG }) })
    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: SLUG } }))
  })

  it('rejects deletion of an already-minted game even for the owner', async () => {
    mockGetActor.mockResolvedValue(walletActor(OWNER))
    mockFindUnique.mockResolvedValue({ ...ownedGame, nftTokenId: '123' })
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ slug: SLUG }) })
    expect(res.status).toBe(400)
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
