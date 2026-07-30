import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/services/session'

export async function POST() {
  try {
    const response = NextResponse.json({ success: true })

    // Clear the wallet session cookie
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      ...sessionCookieOptions(),
      maxAge: 0, // Expire immediately
    })
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to logout' },
      { status: 500 }
    )
  }
}