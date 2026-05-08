import { NextRequest, NextResponse } from 'next/server'
import { generateAudio } from '@/domains/media/services/audio-generation.service'

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 20

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
    const rateLimit = checkRateLimit(ip)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
      )
    }

    const { text, voice = 'Rachel' } = await req.json()
    const response = await generateAudio({ text, voice })

    const nextResponse = NextResponse.json(response, { status: response.error ? 200 : 200 })
    nextResponse.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    return nextResponse
  } catch (error) {
    console.error('[generate-audio] Request failed:', error)
    return NextResponse.json(
      { audioUrl: null, error: error instanceof Error ? error.message : 'Audio generation failed' },
      { status: 500 }
    )
  }
}
