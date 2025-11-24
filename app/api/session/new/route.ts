import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  try {
    // Generate unique session ID
    const sessionId = uuidv4()
    
    // Create session in database
    const session = await prisma.session.create({
      data: {
        sessionId,
        userId: null, // Anonymous for now, will be updated when auth is implemented
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        id: session.id,
      }
    })
    
  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create session' 
      },
      { status: 500 }
    )
  }
}