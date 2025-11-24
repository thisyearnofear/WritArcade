import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/database'

export interface AuthUser {
  id: string
  walletAddress: string
  preferredModel: string
  private: boolean
  // Note: username, avatar, bio fetched from Farcaster at runtime
  // Use getFarcasterProfile(walletAddress) in components
}

/**
 * Get current user from wallet session cookie
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()

    // Check for wallet session
    const walletAddress = cookieStore.get('wallet_session')?.value

    if (!walletAddress) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      preferredModel: user.preferredModel,
      private: user.private,
    }

  } catch (error) {
    console.error('Get current user error:', error)
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