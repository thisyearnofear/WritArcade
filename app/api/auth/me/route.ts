import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/services/auth'
import { fail } from '@/lib/api-response'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      // Keep { authenticated: false } shape for client compatibility
      return NextResponse.json({ success: true, authenticated: false })
    }

    // Keep `user` key (not `data`) — auth-provider, Web3Provider, my-games,
    // and profile clients all read data.user
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: '', // Legacy field for auth provider compatibility
        username: user.walletAddress.substring(0, 8),
        isCreator: user.isCreator,
        isAdmin: user.isAdmin,
        model: user.preferredModel,
        private: user.private,
      },
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return fail('Failed to get user info', 500)
  }
}