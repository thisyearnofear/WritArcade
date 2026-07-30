import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createMagicLinkToken,
  verifyMagicLinkToken,
  isValidEmail,
} from '@/services/magic-link'

const TEST_SECRET = 'test-secret-at-least-16-chars-long'
const EMAIL = 'Marketer@Example.com'
const NOW = 1_700_000_000_000

describe('magic-link tokens', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.AUTH_SECRET = TEST_SECRET
  })

  afterEach(() => {
    delete process.env.AUTH_SECRET
    delete process.env.NEXTAUTH_SECRET
    vi.unstubAllEnvs()
  })

  it('round-trips and normalizes the email to lowercase', () => {
    const token = createMagicLinkToken(EMAIL, NOW)
    expect(verifyMagicLinkToken(token, NOW)).toBe('marketer@example.com')
  })

  it('accepts a token just before expiry and rejects it just after', () => {
    const token = createMagicLinkToken(EMAIL, NOW)
    expect(verifyMagicLinkToken(token, NOW + 15 * 60 * 1000 - 1)).toBe('marketer@example.com')
    expect(verifyMagicLinkToken(token, NOW + 15 * 60 * 1000 + 1)).toBeNull()
  })

  it('rejects a tampered payload (swapped email keeps original MAC)', () => {
    const token = createMagicLinkToken(EMAIL, NOW)
    const [, macPart] = [token.slice(0, token.lastIndexOf('.')), token.slice(token.lastIndexOf('.') + 1)]
    const forgedPayload = Buffer.from(
      JSON.stringify({ e: 'attacker@evil.com', x: NOW + 15 * 60 * 1000 })
    ).toString('base64url')
    expect(verifyMagicLinkToken(`${forgedPayload}.${macPart}`, NOW)).toBeNull()
  })

  it('rejects a tampered MAC', () => {
    const token = createMagicLinkToken(EMAIL, NOW)
    const payload = token.slice(0, token.lastIndexOf('.'))
    expect(verifyMagicLinkToken(`${payload}.${'0'.repeat(64)}`, NOW)).toBeNull()
  })

  it('rejects a tampered expiry (extended lifetime, original MAC)', () => {
    const token = createMagicLinkToken(EMAIL, NOW)
    const macPart = token.slice(token.lastIndexOf('.') + 1)
    const extendedPayload = Buffer.from(
      JSON.stringify({ e: EMAIL.toLowerCase(), x: NOW + 365 * 24 * 60 * 60 * 1000 })
    ).toString('base64url')
    expect(verifyMagicLinkToken(`${extendedPayload}.${macPart}`, NOW)).toBeNull()
  })

  it('rejects malformed values', () => {
    expect(verifyMagicLinkToken(undefined, NOW)).toBeNull()
    expect(verifyMagicLinkToken(null, NOW)).toBeNull()
    expect(verifyMagicLinkToken('', NOW)).toBeNull()
    expect(verifyMagicLinkToken('nodothere', NOW)).toBeNull()
    expect(verifyMagicLinkToken('abc.def', NOW)).toBeNull()
  })

  it('rejects when signed with a different secret', () => {
    const token = createMagicLinkToken(EMAIL, NOW)
    process.env.AUTH_SECRET = 'a-completely-different-secret-9999'
    expect(verifyMagicLinkToken(token, NOW)).toBeNull()
  })

  it('rejects issuing without a secret in production', () => {
    delete process.env.AUTH_SECRET
    delete process.env.NEXTAUTH_SECRET
    expect(() => createMagicLinkToken(EMAIL, NOW)).toThrow()
  })

  it('validates email shapes', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('spaces in@it.com')).toBe(false)
  })
})
