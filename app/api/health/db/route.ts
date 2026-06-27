import { NextResponse } from 'next/server'
import { checkDatabaseHealth } from '@/lib/database'

// Guarded: only enabled when NODE_ENV=production for external uptime monitoring (Vercel cron, health checks).
// In dev/test, return a 404 so this route is never accidentally depended on.
export async function GET() {
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.json(
      { success: false, message: 'Health check only available in production' },
      { status: 404 }
    )
  }

  try {
    const health = await checkDatabaseHealth()
    
    const status = health.healthy ? 200 : 503
    
    return NextResponse.json({
      success: health.healthy,
      database: health.message,
      environment: process.env.NODE_ENV,
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...' || 'NOT_SET',
      timestamp: new Date().toISOString()
    }, { status })
  } catch (error) {
    return NextResponse.json({
      success: false,
      database: `Health check failed: ${error}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}