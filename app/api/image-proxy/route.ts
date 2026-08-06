import { NextResponse } from 'next/server'
import { fail } from '@/lib/api-response'

/**
 * Allowed upstream hostname patterns for the image proxy.
 * Mirrors the remotePatterns in next.config.js so only known image sources
 * are fetched server-side — prevents SSRF (e.g. fetching internal metadata
 * endpoints, cloud instance metadata, etc.).
 */
const ALLOWED_HOSTNAME_PATTERNS: readonly RegExp[] = [
  /^localhost$/,
  /^.+\.ipfs\.io$/,
  /^ipfs\.io$/,
  /^.+\.pinata\.cloud$/,
  /^gateway\.pinata\.cloud$/,
  /^.+\.nft\.storage$/,
  /^.+\.venice\.ai$/,
  /^.+\.openai\.com$/,
  /^oaidalleapiprodscus\.blob\.core\.windows\.net$/,
  /^.+\.paragraph\.xyz$/,
  /^paragraph\.xyz$/,
  /^.+\.vercel\.app$/,
  /^.+\.storyprotocol\.xyz$/,
  // Image CDN providers used by generated game images
  /^.+\.fal\.media$/,
  /^.+\.fal\.run$/,
  /^.+\.replicate\.com$/,
  /^.+\.replicate\.delivery$/,
  /^.+\.modal\.usercontent\.com$/,
  /^basepaint\.xyz$/,
]

function isAllowedHostname(hostname: string): boolean {
  return ALLOWED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return fail('Missing url parameter', 400)
  }

  // Parse and validate the URL — reject non-http(s) schemes.
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return fail('Invalid url parameter', 400)
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return fail('Only http/https URLs are supported', 400)
  }

  // SSRF protection: only proxy known image hostnames
  if (!isAllowedHostname(parsed.hostname)) {
    return fail(`Blocked: hostname "${parsed.hostname}" is not in the image proxy allowlist`, 403)
  }

  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'image/*' },
      // Prevent following redirects to disallowed hosts
      redirect: 'error',
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: `Upstream returned ${upstream.status}` },
        { status: 502 }
      )
    }

    const blob = await upstream.blob()
    const contentType = upstream.headers.get('Content-Type') || 'image/jpeg'

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to proxy image' },
      { status: 502 }
    )
  }
}
