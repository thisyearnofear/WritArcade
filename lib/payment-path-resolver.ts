/**
 * Payment Path Resolver
 *
 * Single source of truth for deciding whether a given article should be
 * paid for with a writer's coin (Base) or with MUSD (Mezo).
 *
 * The decision is derived from the article URL: if the author has a
 * whitelisted writer coin, prefer that. Otherwise, fall back to MUSD so
 * any Paragraph article works.
 *
 * Used by:
 * - SimpleGameForm (hero) — auto-picks payment path as user types URL
 * - /generate page — falls back to URL detection when `pay` query param missing
 * - /mini-app/create — same fallback
 *
 * Reuses `getWriterCoinByAuthor` from lib/writerCoins.ts so all author
 * matching logic lives in one place.
 */

import { getWriterCoinByAuthor, type WriterCoin } from '@/lib/writer-coins'

type PaymentPath = 'writercoin' | 'musd'

export type ResolutionReason =
  | 'writer-coin-match'   // URL author matches a whitelisted writer coin
  | 'no-coin-match'       // URL is valid but author has no coin — use MUSD
  | 'fallback'            // No URL yet, or unparseable — default to MUSD

export interface ResolvedPaymentPath {
  path: PaymentPath
  writerCoin?: WriterCoin
  reason: ResolutionReason
}

const PARAGRAPH_HOSTNAMES = new Set(['paragraph.xyz', 'paragraph.com'])

/**
 * Extract the Paragraph author handle from an article URL.
 * Matches paths like `/@fredwilson/...` or `/@papajams.eth/...`.
 * Returns null for non-Paragraph hosts or unparseable URLs.
 */
function extractParagraphAuthor(url: string): string | null {
  try {
    const u = new URL(url)
    if (!PARAGRAPH_HOSTNAMES.has(u.hostname.replace(/^www\./, ''))) return null
    const match = u.pathname.match(/^\/@?([\w.-]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * Detect a writer coin from an article URL. Returns undefined if the URL
 * is not a Paragraph article, the author has no coin, or the URL is
 * unparseable.
 */
export function detectWriterCoinFromUrl(url: string | null | undefined): WriterCoin | undefined {
  if (!url) return undefined
  const author = extractParagraphAuthor(url)
  if (!author) return undefined
  const coin = getWriterCoinByAuthor(author)
  return coin?.paymentEnabled ? coin : undefined
}

/**
 * Resolve the payment path for an article URL.
 *
 * Priority:
 * 1. If the URL matches a whitelisted writer → `writercoin` with coin attached
 * 2. If the URL is a valid Paragraph article but author has no coin → `musd`
 * 3. If the URL is empty/invalid/unknown host → `musd` (default for new flows)
 */
export function resolvePaymentPath(articleUrl: string | null | undefined): ResolvedPaymentPath {
  if (!articleUrl) {
    return { path: 'musd', reason: 'fallback' }
  }

  const coin = detectWriterCoinFromUrl(articleUrl)
  if (coin) {
    return { path: 'writercoin', writerCoin: coin, reason: 'writer-coin-match' }
  }

  // If we got here the URL either parsed to no author (not Paragraph)
  // or the author has no coin. Either way, MUSD is the universal fallback.
  return { path: 'musd', reason: 'no-coin-match' }
}
