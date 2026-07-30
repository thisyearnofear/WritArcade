import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/database'
import { getActor } from '@/services/auth'
import {
  GUEST_COOKIE_NAME,
  signSubject,
  sessionCookieOptions,
} from '@/services/session'

/**
 * Mint an anonymous guest identity for the no-wallet tier.
 * Idempotent: an existing actor (wallet/email/guest) is returned as-is.
 * Called lazily on first generation attempt, not on page load.
 */
export async function POST() {
  try {
    const existing = await getActor()
    if (existing) {
      return NextResponse.json({
        success: true,
        identity: existing.identity,
        created: false,
      })
    }

    const guestKey = randomBytes(24).toString('base64url')
    await prisma.user.create({ data: { guestKey } })

    const cookieStore = await cookies()
    cookieStore.set(
      GUEST_COOKIE_NAME,
      signSubject({ kind: 'guest', guestKey }),
      sessionCookieOptions()
    )

    return NextResponse.json({ success: true, identity: 'guest', created: true })
  } catch (error) {
    console.error('Guest session error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create guest session' },
      { status: 500 }
    )
  }
}
