import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createMagicLinkToken, sendMagicLinkEmail, isValidEmail } from '@/services/magic-link'
import { checkRateLimit } from '@/services/rate-limit'

const requestSchema = z.object({
  email: z.string().email().max(254),
  redirect: z.string().startsWith('/').max(200).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = requestSchema.parse(body)
    const email = validated.email.trim().toLowerCase()

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkRateLimit(`magic:${email}`).allowed || !checkRateLimit(`magic-ip:${ip}`).allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again in a minute.' },
        { status: 429 }
      )
    }

    const token = createMagicLinkToken(email)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const verifyUrl = new URL('/api/auth/email/verify', siteUrl)
    verifyUrl.searchParams.set('token', token)
    if (validated.redirect) verifyUrl.searchParams.set('redirect', validated.redirect)

    await sendMagicLinkEmail(email, verifyUrl.toString())

    // Always the same response shape — never leak whether the email exists.
    return NextResponse.json({ success: true, message: 'Check your email for a sign-in link.' })
  } catch (error) {
    console.error('[Magic Link Request] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to send sign-in link' }, { status: 500 })
  }
}
