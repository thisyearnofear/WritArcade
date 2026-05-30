/**
 * Paragraph SDK Integration
 * 
 * Uses the official @paragraph_xyz/sdk for metadata + HTML scraping/schema parsing for content
 */

import { createParagraphAPI, type GetPost200, type GetPublication200 } from '@paragraph_xyz/sdk'

const paragraphAPI = createParagraphAPI()

export interface ProcessedArticleData {
  title: string
  content: string
  plainText: string
  author?: string
  authorId?: string
  authorWallet?: string
  publishedAt: Date
  url: string
  source: {
    publicationName: string
    publicationSlug: string
    publicationId: string
  }
  metadata: {
    wordCount: number
    estimatedReadTime: number
    hasCoin: boolean
  }
  publicationSummary?: string
  subscriberCount?: number
}

/**
 * Extract publication slug and post slug from Paragraph URL
 */
export function parseParagraphUrl(url: string): { publicationSlug: string; postSlug: string } | null {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const parts = pathname.split('/').filter(Boolean)
    
    if (parts.length >= 2) {
      const pubSlug = parts[0].replace('@', '')
      const postSlug = parts[1]
      return { publicationSlug: pubSlug, postSlug }
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Extract content from JSON-LD schema in HTML
 */
async function extractContentFromSchema(url: string): Promise<{
  content: string
  wordCount: number
  description?: string
} | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; writersarcade/1.0)'
      }
    })
    
    if (!response.ok) {
      return null
    }
    
    const html = await response.text()
    return extractArticleContentFromHtml(html)
  } catch (error) {
    console.error('Failed to extract content from schema:', 
      error instanceof Error ? error.message : error)
    return null
  }
}

type JsonRecord = Record<string, unknown>

function extractArticleContentFromHtml(html: string): {
  content: string
  wordCount: number
  description?: string
} | null {
  const candidates: string[] = []

  // Prefer JSON-LD article bodies when available.
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(decodeHtmlEntities(match[1].trim()))
      for (const article of findArticleRecords(parsed)) {
        const body = stringFromUnknown(article.articleBody) || stringFromUnknown(article.text)
        const description = stringFromUnknown(article.description)
        if (body) candidates.push(body)
        if (description) candidates.push(description)
      }
    } catch {
      // Ignore malformed structured data and continue through fallbacks.
    }
  }

  // Paragraph pages often hydrate post content into embedded JSON rather than
  // plain article markup. Pull long text fields from the Next payload.
  const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
  if (nextDataMatch) {
    try {
      collectLongStrings(JSON.parse(decodeHtmlEntities(nextDataMatch[1])), candidates)
    } catch {
      // Ignore malformed hydration data.
    }
  }

  const articleText = extractTextFromElement(html, 'article') || extractTextFromElement(html, 'main')
  if (articleText) candidates.push(articleText)

  const metaDescription = extractMetaContent(html, 'description')
    || extractMetaContent(html, 'og:description')
    || extractMetaContent(html, 'twitter:description')
  if (metaDescription) candidates.push(metaDescription)

  const best = candidates
    .map(cleanExtractedText)
    .filter((text) => text.length > 0)
    .sort((a, b) => scoreContentCandidate(b) - scoreContentCandidate(a))[0]

  if (!best) return null

  return {
    content: best,
    wordCount: countWords(best),
    description: metaDescription ? cleanExtractedText(metaDescription) : undefined,
  }
}

function findArticleRecords(value: unknown): JsonRecord[] {
  if (!value || typeof value !== 'object') return []

  if (Array.isArray(value)) {
    return value.flatMap(findArticleRecords)
  }

  const record = value as JsonRecord
  const type = record['@type']
  const types = Array.isArray(type) ? type : [type]
  const isArticle = types.some((item) => typeof item === 'string' && item.toLowerCase().includes('article'))
  const nested = Object.values(record).flatMap(findArticleRecords)

  return isArticle ? [record, ...nested] : nested
}

function collectLongStrings(value: unknown, candidates: string[]) {
  if (!value) return
  if (typeof value === 'string') {
    const cleaned = cleanExtractedText(value)
    if (countWords(cleaned) >= 80) candidates.push(cleaned)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectLongStrings(item, candidates))
    return
  }
  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value as JsonRecord)) {
      if (/content|body|html|markdown|text|description/i.test(key)) {
        collectLongStrings(item, candidates)
      } else if (typeof item === 'object') {
        collectLongStrings(item, candidates)
      }
    }
  }
}

function extractTextFromElement(html: string, tagName: 'article' | 'main'): string | null {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'))
  if (!match) return null
  return htmlToText(match[1])
}

function extractMetaContent(html: string, name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escapedName}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escapedName}["'][^>]*>`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtmlEntities(match[1])
  }
  return null
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|section|article|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
}

function cleanExtractedText(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function stringFromUnknown(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function scoreContentCandidate(text: string): number {
  const words = countWords(text)
  const sentenceCount = (text.match(/[.!?](\s|$)/g) || []).length
  return words + sentenceCount * 5
}

/**
 * Fetch a post using publication slug and post slug
 * Combines API metadata with scraped/parsed content
 */
export async function fetchPostBySlug(
  publicationSlug: string,
  postSlug: string,
  url?: string
): Promise<(GetPost200 & { content?: string; wordCount?: number }) | null> {
  try {
    // Get publication to get its ID
    const publication = await paragraphAPI.getPublicationBySlug(publicationSlug)
    
    // Get post metadata from API
    const post = await paragraphAPI.getPostBySlug(publication.id, postSlug)
    
    // If we have a URL, try to extract content from the page
    if (url) {
      const schemaContent = await extractContentFromSchema(url)
      if (schemaContent) {
        return {
          ...post,
          content: schemaContent.content,
          wordCount: schemaContent.wordCount,
        }
      }
    }

    return post
  } catch (error) {
    console.error(
      `Failed to fetch post ${publicationSlug}/${postSlug}:`,
      error instanceof Error ? error.message : error
    )
    return null
  }
}

/**
 * Fetch user by ID to get wallet address
 */
export async function fetchUserById(userId: string): Promise<{ walletAddress?: string } | null> {
  try {
    const user = await paragraphAPI.getUser(userId)
    return user || null
  } catch (error) {
    console.error(
      `Failed to fetch user ${userId}:`,
      error instanceof Error ? error.message : error
    )
    return null
  }
}

/**
 * Fetch publication metadata by slug
 */
export async function fetchPublicationBySlug(
  slug: string
): Promise<GetPublication200 | null> {
  try {
    const publication = await paragraphAPI.getPublicationBySlug(slug)
    return publication
  } catch (error) {
    console.error(
      `Failed to fetch publication ${slug}:`,
      error instanceof Error ? error.message : error
    )
    return null
  }
}

/**
 * Get subscriber count for a publication
 */
export async function getPublicationSubscriberCount(
  publicationId: string
): Promise<number | null> {
  try {
    const result = await paragraphAPI.getSubscriberCount(publicationId)
    return result.count
  } catch (error) {
    console.error(
      `Failed to fetch subscriber count for ${publicationId}:`,
      error instanceof Error ? error.message : error
    )
    return null
  }
}

/**
 * Process a Paragraph URL and return enriched article data
 * Main entry point for content processing
 */
export async function processArticleFromUrl(url: string): Promise<ProcessedArticleData | null> {
  try {
    // Parse the URL
    const parsed = parseParagraphUrl(url)
    if (!parsed) {
      throw new Error('Invalid Paragraph URL format')
    }

    const { publicationSlug, postSlug } = parsed

    // Fetch the post with content
    const post = await fetchPostBySlug(publicationSlug, postSlug, url)
    if (!post) {
      throw new Error(`Could not fetch post: ${publicationSlug}/${postSlug}`)
    }

    // Fetch publication metadata
    const publication = await fetchPublicationBySlug(publicationSlug)
    if (!publication) {
      throw new Error(`Could not fetch publication: ${publicationSlug}`)
    }

    // Get subscriber count
    const subscriberCount = await getPublicationSubscriberCount(publication.id)

    // Get owner's wallet address
    let authorWallet: string | undefined
    if (publication.ownerUserId) {
      const owner = await fetchUserById(publication.ownerUserId)
      authorWallet = owner?.walletAddress
    }

    // Get content. Prefer the richest text we have; SDK responses can contain
    // very short summaries while the page extraction may contain the full body.
    const apiContent = typeof post.content === 'string' ? post.content : ''
    const scrapedContent = post.wordCount && post.wordCount > countWords(apiContent) ? post.content || '' : ''
    const content = [apiContent, scrapedContent]
      .map((value) => typeof value === 'string' ? value.trim() : '')
      .sort((a, b) => countWords(b) - countWords(a))[0] || ''
    const wordCount = Math.max(post.wordCount || 0, countWords(content))
    const estimatedReadTime = Math.ceil(wordCount / 200)
    const publishedTime = post.publishedAt ? parseInt(post.publishedAt) : Date.now()

    return {
      title: post.title,
      content: content,
      plainText: content, // Already plain text from schema
      author: publication.name,
      authorId: publication.ownerUserId,
      authorWallet,
      publishedAt: new Date(publishedTime),
      url,
      source: {
        publicationName: publication.name,
        publicationSlug: publication.slug,
        publicationId: publication.id,
      },
      metadata: {
        wordCount,
        estimatedReadTime,
        hasCoin: !!post.coinId,
      },
      publicationSummary: (publication as { summary?: string }).summary,
      subscriberCount: subscriberCount || undefined,
    }
  } catch (error) {
    console.error('Error processing article:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Fetch multiple posts from a publication
 */
export async function fetchPublicationPosts(
  publicationSlug: string,
  limit: number = 10
): Promise<GetPost200[] | null> {
  try {
    const publication = await fetchPublicationBySlug(publicationSlug)
    if (!publication) {
      throw new Error(`Publication not found: ${publicationSlug}`)
    }

    const posts = await paragraphAPI.getPosts(publication.id, { limit })
    return posts.items || []
  } catch (error) {
    console.error(
      `Failed to fetch posts from ${publicationSlug}:`,
      error instanceof Error ? error.message : error
    )
    return null
  }
}
