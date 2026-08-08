import { BASEPAINT_SITE_URL } from '@/lib/basepaint/constants'
import { formatBasePaintDayPadded } from '@/lib/basepaint/day'

function getReferrerAddress(): string | undefined {
  const addr = process.env.NEXT_PUBLIC_BASEPAINT_REFERRER_ADDRESS?.trim()
  return addr && /^0x[a-fA-F0-9]{40}$/.test(addr) ? addr : undefined
}

/** Official canvas image API — https://basepaint.xyz/api/art/image?day=N */
export function getBasePaintCanvasUrl(day: number): string {
  return `${BASEPAINT_SITE_URL}/api/art/image?day=${day}`
}

/** Client-safe canvas URL via our image proxy. */
export function getBasePaintCanvasProxyUrl(day: number): string {
  return `/api/image-proxy?url=${encodeURIComponent(getBasePaintCanvasUrl(day))}`
}

/** Timelapse animation CDN — https://basepaint.net/animations/XXXX.mp4 */
export function getBasePaintAnimationUrl(day: number): string {
  return `https://basepaint.net/animations/${formatBasePaintDayPadded(day)}.mp4`
}

/** BasePaint day page with optional mint referrer. */
export function getBasePaintDayUrl(day: number, referrer?: string): string {
  const ref = referrer ?? getReferrerAddress()
  const url = new URL(BASEPAINT_SITE_URL)
  url.searchParams.set('day', String(day))
  if (ref) url.searchParams.set('referrer', ref)
  return url.toString()
}

export function getBasePaintProfileUrl(address: string): string {
  return `${BASEPAINT_SITE_URL}/profile/${address}`
}

export function getBasePaintTrackPixelUrl(ref = 'writersarcade'): string {
  return `${BASEPAINT_SITE_URL}/api/track.gif?ref=${encodeURIComponent(ref)}`
}
