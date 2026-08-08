import { fetchPublicationPosts } from '@/lib/paragraph-sdk'
import { WRITER_COINS } from '@/lib/writerCoins'
import { config } from '@/lib/config'
import { prisma } from '@/lib/prisma'
import { getBasePaintDay } from '@/lib/basepaint/day'
import { setFeaturedDailyArticle } from '@/lib/basepaint/source'
import type { DualDailySource } from '@/lib/basepaint/types'

const DEFAULT_LOOKBACK_DAYS = 14
const POSTS_PER_PUBLICATION = 10

export interface FeaturedAutoResult {
  status: 'created' | 'exists' | 'skipped' | 'failed'
  source?: DualDailySource
  publicationSlug?: string
  reason?: string
}

/** Canonical public URL for a Paragraph post. */
export function buildParagraphPostUrl(publicationSlug: string, postSlug: string): string {
  const pub = publicationSlug.replace(/^@/, '')
  return `https://paragraph.com/@${pub}/${postSlug}`
}

/** Allowlist of publication slugs for Daily featured rotation. */
export function getFeaturedPublicationAllowlist(): string[] {
  const fromEnv = config.dailyChallenge.featuredPublications
  if (fromEnv.length > 0) return fromEnv

  const fromCoins = WRITER_COINS.map((c) => c.paragraphAuthor.trim()).filter(Boolean)
  return [...new Set(fromCoins.map((s) => s.replace(/^@/, '').toLowerCase()))]
}

/**
 * Rotate starting publication by day, then walk the allowlist until a
 * post is found that wasn't featured in the lookback window.
 */
export function orderPublicationsForDay(slugs: string[], day: number): string[] {
  if (slugs.length === 0) return []
  const start = ((day - 1) % slugs.length + slugs.length) % slugs.length
  return [...slugs.slice(start), ...slugs.slice(0, start)]
}

export function pickUnusedPostUrl(
  posts: Array<{ slug?: string | null; title?: string | null }>,
  publicationSlug: string,
  recentUrls: Set<string>
): { url: string; title?: string } | null {
  for (const post of posts) {
    if (!post.slug) continue
    const url = buildParagraphPostUrl(publicationSlug, post.slug)
    if (recentUrls.has(url.toLowerCase())) continue
    return { url, title: post.title || undefined }
  }
  return null
}

async function recentFeaturedUrls(day: number, lookbackDays: number): Promise<Set<string>> {
  const minDay = Math.max(1, day - lookbackDays)
  const rows = await prisma.dailyChallenge.findMany({
    where: {
      day: { gte: minDay, lt: day },
      sourceType: 'dual',
      sourceUrl: { not: null },
    },
    select: { sourceUrl: true },
  })
  return new Set(
    rows
      .map((r) => r.sourceUrl?.toLowerCase())
      .filter((u): u is string => Boolean(u))
  )
}

/**
 * Ensure today's dual Daily has a featured article.
 * - Does not overwrite an existing dual row unless `force` is true (manual/API wins).
 * - Picks from Paragraph allowlist (writer coins / env), skipping recent repeats.
 * - Falls back to env featured URL when auto-pick finds nothing.
 */
export async function ensureTodaysFeaturedArticle(options?: {
  day?: number
  force?: boolean
}): Promise<FeaturedAutoResult> {
  const day = options?.day ?? getBasePaintDay()
  const force = options?.force === true

  if (!config.features.dailyChallenge) {
    return { status: 'skipped', reason: 'daily_challenge_disabled' }
  }

  if (!config.dailyChallenge.autoFeatured && !force) {
    return { status: 'skipped', reason: 'auto_featured_disabled' }
  }

  try {
    const existing = await prisma.dailyChallenge.findUnique({ where: { day } })
    if (
      !force &&
      existing?.sourceType === 'dual' &&
      existing.sourceUrl
    ) {
      return {
        status: 'exists',
        reason: 'already_curated',
        publicationSlug: undefined,
      }
    }

    const lookback =
      config.dailyChallenge.featuredLookbackDays || DEFAULT_LOOKBACK_DAYS
    const recent = await recentFeaturedUrls(day, lookback)
    const allowlist = getFeaturedPublicationAllowlist()
    const ordered = orderPublicationsForDay(allowlist, day)

    for (const publicationSlug of ordered) {
      const posts = await fetchPublicationPosts(
        publicationSlug,
        POSTS_PER_PUBLICATION
      )
      if (!posts?.length) continue

      const pick = pickUnusedPostUrl(posts, publicationSlug, recent)
      if (!pick) continue

      const source = await setFeaturedDailyArticle({
        day,
        articleUrl: pick.url,
        articleTitle: pick.title,
        enrich: true,
      })

      return {
        status: 'created',
        source,
        publicationSlug,
        reason: 'paragraph_allowlist',
      }
    }

    // Fallback: env bootstrap URL
    const envUrl = config.dailyChallenge.featuredArticleUrl
    if (envUrl) {
      const source = await setFeaturedDailyArticle({
        day,
        articleUrl: envUrl,
        articleTitle: config.dailyChallenge.featuredArticleTitle || undefined,
        enrich: true,
      })
      return {
        status: 'created',
        source,
        reason: 'env_fallback',
      }
    }

    return {
      status: 'skipped',
      reason: 'no_candidate_basepaint_only',
    }
  } catch (err) {
    console.error('ensureTodaysFeaturedArticle failed:', err)
    return {
      status: 'failed',
      reason: err instanceof Error ? err.message : 'unknown_error',
    }
  }
}
