import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCookieGet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: mockCookieGet }),
}))

// Mock siwe so verify() enforces the domain option (real siwe does the same).
const mockVerify = vi.fn()
vi.mock('siwe', () => ({
  SiweMessage: class {
    m: { domain?: string; address: string; nonce: string }
    constructor(msg: string) {
      this.m = JSON.parse(msg)
    }
    get domain() {
      return this.m.domain
    }
    async verify(opts: { domain?: string; nonce?: string }) {
      return mockVerify(this, opts)
    }
  },
}))

vi.mock('@/services/session', () => ({
  SESSION_COOKIE_NAME: 'session',
  GUEST_COOKIE_NAME: 'guest',
  USER_COOKIE_NAME: 'user',
  sessionCookieOptions: () => ({}),
  signSessionValue: () => 'signed-token',
  verifySessionValue: () => null,
  verifySubject: () => null,
}))

const mockGetActor = vi.fn()
vi.mock('@/services/auth', () => ({ getActor: () => mockGetActor() }))

const mockUpsert = vi.fn()
vi.mock('@/lib/database', () => ({
  prisma: {
    user: {
      upsert: (...a: unknown[]) => mockUpsert(...a),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { POST } from '@/app/api/auth/verify/route'

const USER = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'

function makeRequest(message: string) {
  return new Request('http://localhost:3000/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify({ message, signature: '0x1234' }),
  })
}

function makeMessage(domain: string) {
  return JSON.stringify({
    domain,
    address: USER,
    chainId: 8453,
    nonce: 'nonce123',
    uri: 'https://writersarcade.vercel.app',
    version: '1',
    issuedAt: new Date().toISOString(),
    statement: 'Sign in to WritersArcade',
  })
}

describe('POST /api/auth/verify — SIWE domain enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCookieGet.mockReturnValue({ value: 'nonce123' })
    mockGetActor.mockResolvedValue(null)
  })

  it('rejects a message signed for a different domain', async () => {
    // Request host is localhost:3000; the message is signed for evil.com.
    mockVerify.mockRejectedValue(new Error('Domain does not match the provided domain.'))
    const res = await POST(makeRequest(makeMessage('evil.com')))
    expect(mockVerify).toHaveBeenCalled()
    // opts.domain must be enforced (localhost:3000), not the message's domain.
    const [, opts] = mockVerify.mock.calls[0]
    expect(opts.domain).toBe('localhost:3000')
    expect(res.status).toBe(401)
  })

  it('accepts a message signed for the expected domain', async () => {
    mockVerify.mockResolvedValue({
      data: { address: USER, nonce: 'nonce123' },
    })
    mockUpsert.mockResolvedValue({ id: 'u1', walletAddress: USER })
    const res = await POST(makeRequest(makeMessage('localhost:3000')))
    expect(mockVerify).toHaveBeenCalled()
    const [, opts] = mockVerify.mock.calls[0]
    expect(opts.domain).toBe('localhost:3000')
    expect(res.status).toBe(200)
  })

  it('passes the request host (not a caller-chosen domain) to siwe', async () => {
    mockVerify.mockResolvedValue({ data: { address: USER, nonce: 'nonce123' } })
    mockUpsert.mockResolvedValue({ id: 'u1', walletAddress: USER })
    // Even if the client claims a different domain, the server enforces its own host.
    await POST(makeRequest(makeMessage('evil.com')))
    const [, opts] = mockVerify.mock.calls[0]
    expect(opts.domain).toBe('localhost:3000')
  })
})