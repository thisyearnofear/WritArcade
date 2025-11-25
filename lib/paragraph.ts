/**
 * Paragraph Integration Utilities
 * 
 * Fetches articles from Paragraph-hosted newsletters/blogs
 * Validates article authors against writer coin whitelist
 */

import { getWriterCoinByAuthor, validateArticleUrl } from './writerCoins'

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
 * Fetch article from Paragraph URL
 * Supports both JSON API and HTML scraping
 */
export async function fetchParagraphArticle(
    url: string
): Promise<ParagraphArticle | null> {
    try {
        // Try JSON API first (if available)
        const jsonUrl = url.endsWith('.json') ? url : `${url}.json`

        try {
            const response = await fetch(jsonUrl)
            if (response.ok) {
                const data = await response.json()
                return {
                    title: data.title || 'Untitled',
                    content: data.content || data.body || '',
                    author: data.author || extractParagraphAuthor(url) || undefined,
                    publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
                    url: url,
                    excerpt: data.excerpt || data.description,
                    wordCount: countWords(data.content || data.body || ''),
                }
            }
        } catch (jsonError) {
            console.log('JSON API not available, falling back to HTML scraping')
        }

        // Fallback to HTML scraping
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Failed to fetch article: ${response.status}`)
        }

        const html = await response.text()

        // Extract title
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled'

        // Extract content (look for common article containers)
        const contentMatch = html.match(
            /<article[^>]*>([\s\S]*?)<\/article>/i
        ) || html.match(
            /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i
        )

        let content = contentMatch ? contentMatch[1] : ''

        // Strip HTML tags for plain text content
        content = content.replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

        if (!content) {
            throw new Error('Could not extract article content')
        }

        return {
            title,
            content,
            author: extractParagraphAuthor(url) || undefined,
            url,
            wordCount: countWords(content),
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
 * Count words in text
 */
function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Estimate reading time in minutes
 */
export function estimateReadingTime(wordCount: number): number {
    const wordsPerMinute = 200
    return Math.ceil(wordCount / wordsPerMinute)
}
