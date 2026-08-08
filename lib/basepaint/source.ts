import { buildBasePaintPromptText, buildDualSourcePromptText } from '@/lib/basepaint/prompt'
import { fetchBasePaintTheme } from '@/lib/basepaint/theme'
import type { BasePaintDailySource, DualDailySource, ResolvedDailySource } from '@/lib/basepaint/types'
import { getBasePaintCanvasUrl } from '@/lib/basepaint/urls'
import { getBasePaintCanvasDescription } from '@/lib/basepaint/vision'
import { config } from '@/lib/config'
import { prisma } from '@/lib/prisma'

/** Build a daily challenge source from a BasePaint canvas day. */
export async function getBasePaintDailySource(
  day: number,
  canvasDescription?: string | null
): Promise<BasePaintDailySource> {
  const theme = await fetchBasePaintTheme(day)
  const canvasUrl = getBasePaintCanvasUrl(day)

  return {
    day,
    sourceType: 'basepaint',
    basePaintDay: day,
    theme: theme?.theme || `BasePaint Day ${day}`,
    palette: theme?.palette || [],
    canvasUrl,
    canvasDescription: canvasDescription || undefined,
    promptText: buildBasePaintPromptText({
      theme: theme?.theme,
      palette: theme?.palette || [],
      canvasDescription,
    }),
  }
}

export interface DualSourceArticleInput {
  url: string
  title?: string | null
  author?: string | null
  themes?: string | null
  text?: string | null
}

/** Build dual Daily source: article (plot) + BasePaint (world). */
export async function getDualDailySource(
  day: number,
  article: DualSourceArticleInput,
  canvasDescription?: string | null
): Promise<DualDailySource> {
  const theme = await fetchBasePaintTheme(day)
  const canvasUrl = getBasePaintCanvasUrl(day)
  const description =
    canvasDescription === undefined
      ? await getBasePaintCanvasDescription(day)
      : canvasDescription
  const canvasTheme = theme?.theme || `BasePaint Day ${day}`
  const articleTitle = article.title?.trim() || undefined
  const displayTheme = articleTitle
    ? `${articleTitle} × ${canvasTheme}`
    : canvasTheme

  return {
    day,
    sourceType: 'dual',
    sourceUrl: article.url,
    basePaintDay: day,
    theme: displayTheme,
    canvasTheme,
    articleTitle,
    articleAuthor: article.author?.trim() || undefined,
    palette: theme?.palette || [],
    canvasUrl,
    canvasDescription: description || undefined,
    promptText: buildDualSourcePromptText({
      articleTitle,
      articleAuthor: article.author,
      articleThemes: article.themes,
      articleText: article.text,
      articleUrl: article.url,
      theme: canvasTheme,
      palette: theme?.palette || [],
      canvasDescription: description,
    }),
  }
}

async function resolveFeaturedArticleUrl(day: number): Promise<{
  url: string
  title?: string
  author?: string
  fromDb: boolean
} | null> {
  try {
    const existing = await prisma.dailyChallenge.findUnique({ where: { day } })
    if (existing?.sourceType === 'dual' && existing.sourceUrl) {
      return {
        url: existing.sourceUrl,
        title: existing.articleTitle || undefined,
        author: existing.articleAuthor || undefined,
        fromDb: true,
      }
    }
  } catch (err) {
    console.warn('Dual Daily: DB featured lookup failed', err)
  }

  const envUrl = config.dailyChallenge.featuredArticleUrl
  if (!envUrl) return null

  return {
    url: envUrl,
    title: config.dailyChallenge.featuredArticleTitle || undefined,
    fromDb: false,
  }
}

/**
 * Resolve today's Daily source:
 * 1. DB dual row with sourceUrl
 * 2. Env featured article bootstrap
 * 3. BasePaint-only
 */
export async function getTodaysDailySource(
  day: number,
  options?: {
    canvasDescription?: string | null
    /** When true, fetch + extract featured article text for a full dual prompt. */
    enrichArticle?: boolean
  }
): Promise<ResolvedDailySource> {
  const featured = await resolveFeaturedArticleUrl(day)
  if (!featured) {
    return getBasePaintDailySource(day, options?.canvasDescription)
  }

  let article: DualSourceArticleInput = {
    url: featured.url,
    title: featured.title,
    author: featured.author,
  }

  if (options?.enrichArticle !== false) {
    try {
      const { ContentProcessorService } = await import(
        '@/domains/content/services/content-processor.service'
      )
      if (ContentProcessorService.isValidUrl(featured.url)) {
        const processed = await ContentProcessorService.processUrl(featured.url)
        const themes = ContentProcessorService.extractArticleThemes(
          processed.text,
          processed.title
        )
        article = {
          url: featured.url,
          title: processed.title || featured.title || undefined,
          author: processed.author || featured.author || undefined,
          themes,
          text: processed.text,
        }
      }
    } catch (err) {
      console.warn('Dual Daily: featured article enrich failed, using cached metadata', err)
    }
  }

  return getDualDailySource(day, article, options?.canvasDescription)
}

/**
 * Persist today's dual Daily featured article (ops / cron).
 * Bootstraps BasePaint palette/canvas onto the row.
 */
export async function setFeaturedDailyArticle(input: {
  day: number
  articleUrl: string
  articleTitle?: string | null
  articleAuthor?: string | null
  enrich?: boolean
}): Promise<DualDailySource> {
  let title = input.articleTitle?.trim() || undefined
  let author = input.articleAuthor?.trim() || undefined
  let themes: string | undefined
  let text: string | undefined

  if (input.enrich !== false) {
    try {
      const { ContentProcessorService } = await import(
        '@/domains/content/services/content-processor.service'
      )
      if (ContentProcessorService.isValidUrl(input.articleUrl)) {
        const processed = await ContentProcessorService.processUrl(input.articleUrl)
        title = processed.title || title
        author = processed.author || author
        themes = ContentProcessorService.extractArticleThemes(
          processed.text,
          processed.title
        )
        text = processed.text
      }
    } catch (err) {
      console.warn('setFeaturedDailyArticle: enrich failed', err)
    }
  }

  const source = await getDualDailySource(input.day, {
    url: input.articleUrl,
    title,
    author,
    themes,
    text,
  })

  await prisma.dailyChallenge.upsert({
    where: { day: input.day },
    create: {
      day: source.day,
      sourceType: 'dual',
      sourceUrl: source.sourceUrl,
      basePaintDay: source.basePaintDay,
      theme: source.theme,
      articleTitle: source.articleTitle || null,
      articleAuthor: source.articleAuthor || null,
      palette: source.palette,
      canvasUrl: source.canvasUrl,
      active: true,
    },
    update: {
      sourceType: 'dual',
      sourceUrl: source.sourceUrl,
      basePaintDay: source.basePaintDay,
      theme: source.theme,
      articleTitle: source.articleTitle || null,
      articleAuthor: source.articleAuthor || null,
      palette: source.palette,
      canvasUrl: source.canvasUrl,
      active: true,
    },
  })

  return source
}
