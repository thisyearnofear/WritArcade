/**
 * Paragraph Integration Utilities
 * 
 * Wrapper around the Paragraph SDK for fetching and validating articles
 */

import { processArticleFromUrl } from './paragraph-sdk'
import { getWriterCoinByAuthor, validateArticleUrl } from '@/lib/writer-coins'

export interface ParagraphArticle {
  title: string
  content: string
  author?: string
  publishedAt?: Date
  url: string
  excerpt?: string
  wordCount: number
}

/**
 * Extract Paragraph author from URL
 * Example: https://paragraph.xyz/@author/article-slug -> "author"
 */
export function extractParagraphAuthor(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathMatch = urlObj.pathname.match(/@([^/]+)/)
    return pathMatch ? pathMatch[1] : null
  } catch {
    return null
  }
}

/**
 * Fetch article from Paragraph URL using the SDK
 */
export async function fetchParagraphArticle(
  url: string
): Promise<ParagraphArticle | null> {
  try {
    const article = await processArticleFromUrl(url)
    
    if (!article) {
      return null
    }

    return {
      title: article.title,
      content: article.content,
      author: article.author || extractParagraphAuthor(url) || undefined,
      publishedAt: article.publishedAt,
      url: url,
      excerpt: article.plainText.substring(0, 200),
      wordCount: article.metadata.wordCount,
    }
  } catch (error) {
    console.error('Error fetching Paragraph article:', error)
    return null
  }
}

/**
 * Validate article URL matches writer coin
 */
export async function validateArticleForWriterCoin(
  url: string,
  writerCoinId: string
): Promise<{ valid: boolean; error?: string }> {
  // Check URL format
  if (!validateArticleUrl(url, writerCoinId)) {
    return {
      valid: false,
      error: 'Article URL does not match the selected writer coin',
    }
  }

  // Extract and validate author
  const author = extractParagraphAuthor(url)
  if (!author) {
    return {
      valid: false,
      error: 'Could not extract author from URL',
    }
  }

  const writerCoin = getWriterCoinByAuthor(author)
  if (!writerCoin || writerCoin.id !== writerCoinId) {
    return {
      valid: false,
      error: `Article author does not match writer coin. Expected: ${writerCoin?.paragraphAuthor}`,
    }
  }

  return { valid: true }
}

/**
 * Estimate reading time in minutes
 */
export function estimateReadingTime(wordCount: number): number {
  const wordsPerMinute = 200
  return Math.ceil(wordCount / wordsPerMinute)
}
