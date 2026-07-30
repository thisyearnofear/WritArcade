
import { cookies } from 'next/headers'
import { prisma } from '@/lib/database'
import {
  SESSION_COOKIE_NAME,
  GUEST_COOKIE_NAME,
  USER_COOKIE_NAME,
  verifySessionValue,
  verifySubject,
} from '@/services/session'
import type { User } from '@prisma/client'

export interface AuthUser {
  id: string
  walletAddress: string
  preferredModel: string
  private: boolean
  isCreator: boolean
  isAdmin: boolean
  // Note: username, avatar, bio fetched from Farcaster at runtime
  // Use getFarcasterProfile(walletAddress) in components
}

export type ActorIdentity = 'wallet' | 'email' | 'guest'

export interface Actor {
  user: User
  identity: ActorIdentity
}

/**
 * Get current user from wallet session cookie
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()

    // Check for wallet session (HMAC-signed; forged cookies are rejected)
    const walletAddress = verifySessionValue(cookieStore.get(SESSION_COOKIE_NAME)?.value)

    if (!walletAddress) {
      return null
    }

    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: walletAddress, mode: 'insensitive' } },
    })

    if (!user || !user.walletAddress) {
      return null
    }

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      preferredModel: user.preferredModel,
      private: user.private,
      isCreator: user.isCreator,
      isAdmin: user.isAdmin,
    }

  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

/**
 * Resolve the current actor across all identity kinds.
 * Precedence: wallet session → email user session → guest session.
 */
export async function getActor(): Promise<Actor | null> {
  try {
    const cookieStore = await cookies()

    const walletAddress = verifySessionValue(cookieStore.get(SESSION_COOKIE_NAME)?.value)
    if (walletAddress) {
      const user = await prisma.user.findFirst({
        where: { walletAddress: { equals: walletAddress, mode: 'insensitive' } },
      })
      if (user) return { user, identity: 'wallet' }
    }

    const userSubject = verifySubject(cookieStore.get(USER_COOKIE_NAME)?.value)
    if (userSubject?.kind === 'user') {
      const user = await prisma.user.findUnique({ where: { id: userSubject.userId } })
      if (user) return { user, identity: 'email' }
    }

    const guestSubject = verifySubject(cookieStore.get(GUEST_COOKIE_NAME)?.value)
    if (guestSubject?.kind === 'guest') {
      const user = await prisma.user.findUnique({ where: { guestKey: guestSubject.guestKey } })
      if (user) return { user, identity: 'guest' }
    }

    return null
  } catch (error) {
    console.error('Get actor error:', error)
    return null
  }
}

/**
 * Require authentication for API routes
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}

/**
 * Check if user is admin (for future use)
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()

  // For now, we can add an isAdmin field to the User model later
  // or check against a whitelist of wallet addresses

  return user
}

/**
 * Optional authentication - returns null if not authenticated
 */
export async function optionalAuth(): Promise<AuthUser | null> {
  return await getCurrentUser()
}