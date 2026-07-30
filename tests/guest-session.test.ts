import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import {
  signSubject,
  verifySubject,
  signSessionValue,
  verifySessionValue,
  GUEST_COOKIE_NAME,
  USER_COOKIE_NAME,
} from '@/services/session'

const TEST_SECRET = 'test-secret-at-least-16-chars-long'
const GUEST_KEY = 'AbCdEfGh12345678_-abcdef'
const USER_ID = 'clx0000000000000000000001'

describe('signed subject cookies (guest/user)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.AUTH_SECRET = TEST_SECRET
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.AUTH_SECRET
    delete process.env.NEXTAUTH_SECRET
  })

  it('exports the expected cookie names', () => {
    expect(GUEST_COOKIE_NAME).toBe('guest_session')
    expect(USER_COOKIE_NAME).toBe('user_session')
  })

  it('round-trips a guest subject', () => {
    const signed = signSubject({ kind: 'guest', guestKey: GUEST_KEY })
    expect(verifySubject(signed)).toEqual({ kind: 'guest', guestKey: GUEST_KEY })
  })

  it('round-trips a user subject', () => {
    const signed = signSubject({ kind: 'user', userId: USER_ID })
    expect(verifySubject(signed)).toEqual({ kind: 'user', userId: USER_ID })
  })

  it('rejects a tampered payload with the original MAC', () => {
    const signed = signSubject({ kind: 'guest', guestKey: GUEST_KEY })
    const mac = signed.slice(signed.lastIndexOf('.') + 1)
    expect(verifySubject(`g:someoneelse12345.${mac}`)).toBeNull()
  })

  it('rejects kind-swapping (guest MAC used as user subject)', () => {
    const signed = signSubject({ kind: 'guest', guestKey: GUEST_KEY })
    const mac = signed.slice(signed.lastIndexOf('.') + 1)
    expect(verifySubject(`u:${GUEST_KEY}.${mac}`)).toBeNull()
  })

  it('rejects a tampered MAC', () => {
    const signed = signSubject({ kind: 'guest', guestKey: GUEST_KEY })
    const payload = signed.slice(0, signed.lastIndexOf('.'))
    expect(verifySubject(`${payload}.${'0'.repeat(64)}`)).toBeNull()
  })

  it('rejects unsigned raw payloads and malformed values', () => {
    expect(verifySubject(`g:${GUEST_KEY}`)).toBeNull()
    expect(verifySubject('')).toBeNull()
    expect(verifySubject(null)).toBeNull()
    expect(verifySubject(undefined)).toBeNull()
    expect(verifySubject('x:badkind1234567.deadbeef')).toBeNull()
    expect(verifySubject('g:short.deadbeef')).toBeNull()
  })

  it('is not interchangeable with wallet session values', () => {
    const walletSigned = signSessionValue('0x' + 'a'.repeat(40))
    expect(verifySubject(walletSigned)).toBeNull()
    const guestSigned = signSubject({ kind: 'guest', guestKey: GUEST_KEY })
    expect(verifySessionValue(guestSigned)).toBeNull()
  })

  it('rejects when signed under a different secret', async () => {
    const signed = signSubject({ kind: 'guest', guestKey: GUEST_KEY })
    process.env.AUTH_SECRET = 'another-secret-that-is-long-enough'
    const mod = await import('@/services/session')
    expect(mod.verifySubject(signed)).toBeNull()
  })
})
