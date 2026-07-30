import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// We test the pure crypto helpers without Next.js runtime. The module imports
// `next/headers` at the top of services/auth.ts, but session.ts is standalone.
import {
  signSessionValue,
  verifySessionValue,
  SESSION_COOKIE_NAME,
} from '@/services/session'

const TEST_SECRET = 'test-secret-at-least-16-chars-long'
const TEST_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'

describe('signed session cookie', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.AUTH_SECRET = TEST_SECRET
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.AUTH_SECRET
    delete process.env.NEXTAUTH_SECRET
  })

  it('exports the expected cookie name', () => {
    expect(SESSION_COOKIE_NAME).toBe('wallet_session')
  })

  it('signs an address into address.mac format', () => {
    const signed = signSessionValue(TEST_ADDRESS)
    const [addr, mac] = signed.split('.')
    expect(addr).toBe(TEST_ADDRESS.toLowerCase())
    expect(mac).toMatch(/^[0-9a-f]{64}$/)
  })

  it('verifies a correctly signed value and returns the address', () => {
    const signed = signSessionValue(TEST_ADDRESS)
    expect(verifySessionValue(signed)).toBe(TEST_ADDRESS.toLowerCase())
  })

  it('round-trips through sign + verify', () => {
    const signed = signSessionValue('0x' + 'a'.repeat(40))
    expect(verifySessionValue(signed)).toBe('0x' + 'a'.repeat(40))
  })

  it('rejects a forged cookie (tampered address)', () => {
    const signed = signSessionValue(TEST_ADDRESS)
    const [addr, mac] = signed.split('.')
    // Swap to a different address but keep the original MAC
    const forged = `0xdeadbeef${addr.slice(10)}.${mac}`
    expect(verifySessionValue(forged)).toBeNull()
  })

  it('rejects a forged cookie (tampered MAC)', () => {
    const signed = signSessionValue(TEST_ADDRESS)
    const [addr] = signed.split('.')
    const forged = `${addr}.0000000000000000000000000000000000000000000000000000000000000000`
    expect(verifySessionValue(forged)).toBeNull()
  })

  it('rejects a raw wallet address (unsigned, the old format)', () => {
    expect(verifySessionValue(TEST_ADDRESS)).toBeNull()
  })

  it('rejects undefined / null / empty', () => {
    expect(verifySessionValue(undefined)).toBeNull()
    expect(verifySessionValue(null)).toBeNull()
    expect(verifySessionValue('')).toBeNull()
  })

  it('rejects malformed values (no dot, bad hex)', () => {
    expect(verifySessionValue('nodothere')).toBeNull()
    expect(verifySessionValue('0x1234.abcd')).toBeNull()
    expect(verifySessionValue(`${TEST_ADDRESS}.tooshort`)).toBeNull()
  })

  it('rejects when no secret is configured in production', async () => {
    // Sign while the secret is still present
    const signed = signSessionValue(TEST_ADDRESS)
    // Then remove the secret and re-import so getSessionSecret reads fresh env
    delete process.env.AUTH_SECRET
    delete process.env.NEXTAUTH_SECRET
    const mod = await import('@/services/session')
    expect(mod.verifySessionValue(signed)).toBeNull()
  })

  it('signs under a different secret than it verifies with => rejected', async () => {
    const signed = signSessionValue(TEST_ADDRESS)
    process.env.AUTH_SECRET = 'test-placeholder-secret-not-real-9999'
    const mod = await import('@/services/session')
    expect(mod.verifySessionValue(signed)).toBeNull()
  })
})
