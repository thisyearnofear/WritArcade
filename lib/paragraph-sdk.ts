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
        'User-Agent': 'Mozilla/5.0 (compatible; WritArcade/1.0)'
      }
    })
    
    if (!response.ok) {
      return null
    }
    
    const html = await response.text()
    
    // Look for JSON-LD schema with article content
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1])
        
        // Handle both single object and @graph array
        const articles = Array.isArray(jsonLd['@graph']) 
          ? jsonLd['@graph'].filter((item: any) => item['@type'] === 'Article')
          : [jsonLd]
        
        const article = articles[0]
        if (article && article.wordCount && article.description) {
          return {
            content: article.description,
            wordCount: article.wordCount,
            description: article.description
          }
        }
      } catch (e) {
        // JSON parsing failed
      }
    }
    
    // Fallback: extract from meta tags
    const descMatch = html.match(/<meta name="og:description"[^>]*content="([^"]*)"/i)
    if (descMatch) {
      const description = descMatch[1]
      // Estimate word count
      const wordCount = description.split(/\s+/).length
      return {
        content: description,
        wordCount: wordCount,
        description: description
      }
    }
    
    return null
  } catch (error) {
    console.error('Failed to extract content from schema:', 
      error instanceof Error ? error.message : error)
    return null
  }
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
        } as any
      }
    }
    
    return post as any
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

    // Get content
    const content = post.content || ''
    const wordCount = post.wordCount || countWords(content)
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
      publicationSummary: (publication as any).summary,
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
