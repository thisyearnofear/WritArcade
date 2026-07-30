import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Magic-link tokens: HMAC-signed `<base64url payload>.<mac>` with a 15-minute
 * expiry. Same secret as session cookies but a distinct domain-separation
 * prefix, so tokens and cookies are never interchangeable.
 */

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000
const DEV_FALLBACK_SECRET = 'writarcade-dev-session-secret-do-not-use-in-prod'

function getSecret(): string | null {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (secret && secret.length >= 16) return secret
  if (process.env.NODE_ENV === 'production') return null
  return DEV_FALLBACK_SECRET
}

function mac(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`writarcade-magiclink:v1:${payload}`)
    .digest('hex')
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

export function createMagicLinkToken(email: string, now: number = Date.now()): string {
  const secret = getSecret()
  if (!secret) {
    throw new Error('AUTH_SECRET (>= 16 chars) is required in production to issue magic links')
  }
  const normalized = email.trim().toLowerCase()
  const payload = Buffer.from(
    JSON.stringify({ e: normalized, x: now + MAGIC_LINK_TTL_MS })
  ).toString('base64url')
  return `${payload}.${mac(payload, secret)}`
}

/** Returns the verified email, or null if forged, malformed, or expired. */
export function verifyMagicLinkToken(
  token: string | undefined | null,
  now: number = Date.now()
): string | null {
  if (!token) return null
  const secret = getSecret()
  if (!secret) return null

  const lastDot = token.lastIndexOf('.')
  if (lastDot <= 0) return null

  const payload = token.slice(0, lastDot)
  const providedMac = token.slice(lastDot + 1)
  if (!/^[0-9a-f]{64}$/.test(providedMac)) return null

  const provided = Buffer.from(providedMac, 'utf8')
  const expected = Buffer.from(mac(payload, secret), 'utf8')
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof data.e !== 'string' || typeof data.x !== 'number') return null
    if (now > data.x) return null
    if (!isValidEmail(data.e)) return null
    return data.e
  } catch {
    return null
  }
}

/** Send the magic link via Resend's REST API (no SDK dependency). */
export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[MagicLink] RESEND_API_KEY not set — dev link for ${email}: ${url}`)
      return
    }
    throw new Error('RESEND_API_KEY is not configured')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAGIC_LINK_FROM_EMAIL || 'WritersArcade <login@writersarcade.xyz>',
      to: [email],
      subject: 'Your WritersArcade sign-in link',
      html: `<p>Click to sign in to WritersArcade. This link expires in 15 minutes.</p><p><a href="${url}">Sign in to WritersArcade</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Magic link email failed: ${response.status} ${detail}`)
  }
}
