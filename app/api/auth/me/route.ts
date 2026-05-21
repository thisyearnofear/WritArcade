import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: true, authenticated: false },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: '', // Legacy field for auth provider compatibility
        username: user.walletAddress.substring(0, 8), // Shortened wallet as username
        isCreator: user.isCreator,
        isAdmin: user.isAdmin,
        model: user.preferredModel,
        private: user.private,
      }
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get user info' },
      { status: 500 }
    )
  }
}