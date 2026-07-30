import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Signed wallet session cookies.
 *
 * The wallet_session cookie previously held a raw wallet address, which any
 * client could forge to impersonate a user. Session values are now
 * `<walletAddress>.<hmac>` where the HMAC is keyed with a server secret.
 */

const SESSION_COOKIE_NAME = 'wallet_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 1 week
const DEV_FALLBACK_SECRET = 'writarcade-dev-session-secret-do-not-use-in-prod'

function getSessionSecret(): string | null {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (secret && secret.length >= 16) {
    return secret
  }

  if (process.env.NODE_ENV === 'production') {
    // Fail closed: never issue or accept sessions without a real secret.
    return null
  }

  return DEV_FALLBACK_SECRET
}

function hmac(value: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`writarcade-session:v1:${value}`)
    .digest('hex')
}

/** Create the signed cookie value for a wallet address. */
export function signSessionValue(walletAddress: string): string {
  const secret = getSessionSecret()
  if (!secret) {
    throw new Error(
      'AUTH_SECRET (>= 16 chars) is required in production to issue sessions'
    )
  }
  const address = walletAddress.toLowerCase()
  return `${address}.${hmac(address, secret)}`
}

/**
 * Verify a signed cookie value and return the wallet address, or null if the
 * value is missing, malformed, or forged.
 */
export function verifySessionValue(value: string | undefined | null): string | null {
  if (!value) return null

  const secret = getSessionSecret()
  if (!secret) return null

  const lastDot = value.lastIndexOf('.')
  if (lastDot <= 0) return null

  const address = value.slice(0, lastDot).toLowerCase()
  const providedMac = value.slice(lastDot + 1)

  if (!/^0x[0-9a-f]{40}$/.test(address) || !/^[0-9a-f]{64}$/.test(providedMac)) {
    return null
  }

  const expectedMac = hmac(address, secret)
  const provided = Buffer.from(providedMac, 'utf8')
  const expected = Buffer.from(expectedMac, 'utf8')

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null
  }

  return address
}

/** Shared cookie options for the session cookie. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  }
}

export { SESSION_COOKIE_NAME }
