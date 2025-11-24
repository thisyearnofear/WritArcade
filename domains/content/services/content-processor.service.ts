import axios from 'axios'
import { marked } from 'marked'

export interface ContentSource {
  url: string
  type: 'newsletter' | 'blog' | 'article' | 'unknown'
  title?: string
  author?: string
  publishedAt?: Date
}

export interface ProcessedContent {
  text: string
  title?: string
  author?: string
  publishedAt?: Date
  wordCount: number
  estimatedReadTime: number
  source: ContentSource
}

/**
 * Consolidated Content Processing Service
 * Merges scraper.js, hackernews.js functionality with enhancements
 */
export class ContentProcessorService {
  
  private static readonly SCRAPING_API_KEY = process.env.SCRAPINGWEB_API_KEY
  private static readonly EXTRACTOR_API_KEY = process.env.EXTRACTOR_API_KEY
  
  /**
   * Process content from URL - enhanced consolidation of existing scrapers
   */
  static async processUrl(url: string): Promise<ProcessedContent> {
    try {
      // Determine content type
      const contentType = this.detectContentType(url)
      
      // Extract content based on type
      let extractedText: string
      let metadata: Partial<ProcessedContent> = {}
      
      if (this.isHackerNewsUrl(url)) {
        const hnData = await this.processHackerNewsUrl(url)
        extractedText = hnData.text
        metadata = hnData.metadata
      } else {
        extractedText = await this.scrapeGenericUrl(url)
      }
      
      // Process and clean the text
      const cleanText = this.cleanAndProcessText(extractedText)
      const wordCount = this.countWords(cleanText)
      const estimatedReadTime = Math.ceil(wordCount / 200) // ~200 WPM average
      
      return {
        text: cleanText,
        wordCount,
        estimatedReadTime,
        source: { url, type: contentType },
        ...metadata,
      }
    } catch (error) {
      console.error('Content processing error:', error)
      throw new Error(`Failed to process content from URL: ${url}`)
    }
  }
  
  /**
   * Process multiple URLs (for newsletter archives, etc.)
   */
  static async processMultipleUrls(urls: string[]): Promise<ProcessedContent[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.processUrl(url))
    )
    
    return results
      .filter((result): result is PromiseFulfilledResult<ProcessedContent> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)
  }
  
  /**
   * Enhanced URL scraping with fallback methods
   */
  private static async scrapeGenericUrl(url: string): Promise<string> {
    // Try primary scraping service
    if (this.SCRAPINGWEB_API_KEY) {
      try {
        const response = await axios.get('https://scrapingweb.com/api/v1/text', {
          params: {
            apikey: this.SCRAPINGWEB_API_KEY,
            url: url
          },
          timeout: 10000
        })
        
        if (response.data?.text) {
          return response.data.text
        }
      } catch (error) {
        console.warn('ScrapingWeb API failed, trying fallback:', error)
      }
    }
    
    // Try fallback extractor service
    if (this.EXTRACTOR_API_KEY) {
      try {
        const endpoint = `https://extractorapi.com/api/v1/extractor/?apikey=${this.EXTRACTOR_API_KEY}&url=${encodeURIComponent(url)}`
        const response = await axios.get(endpoint, { timeout: 10000 })
        
        if (response.data?.text) {
          return response.data.text
        }
      } catch (error) {
        console.warn('ExtractorAPI failed:', error)
      }
    }
    
    throw new Error('All scraping methods failed')
  }
  
  /**
   * Process HackerNews URLs (enhanced from hackernews.js)
   */
  private static async processHackerNewsUrl(url: string): Promise<{
    text: string
    metadata: Partial<ProcessedContent>
  }> {
    try {
      // Extract story ID from HN URL
      const storyId = this.extractHackerNewsId(url)
      
      if (storyId) {
        // Get HN story data
        const hnResponse = await axios.get(
          `https://hacker-news.firebaseio.com/v0/item/${storyId}.json`,
          { timeout: 5000 }
        )
        
        const story = hnResponse.data
        
        if (story?.url) {
          // Get the actual article content
          const articleText = await this.scrapeGenericUrl(story.url)
          
          return {
            text: articleText,
            metadata: {
              title: story.title,
              author: story.by,
              publishedAt: story.time ? new Date(story.time * 1000) : undefined,
            }
          }
        } else if (story?.text) {
          // HN text post
          return {
            text: story.text,
            metadata: {
              title: story.title,
              author: story.by,
              publishedAt: story.time ? new Date(story.time * 1000) : undefined,
            }
          }
        }
      }
      
      throw new Error('Unable to extract HackerNews content')
    } catch (error) {
      console.error('HackerNews processing error:', error)
      // Fallback to regular scraping
      const text = await this.scrapeGenericUrl(url)
      return { text, metadata: {} }
    }
  }
  
  /**
   * Detect content type from URL patterns
   */
  private static detectContentType(url: string): ContentSource['type'] {
    const hostname = new URL(url).hostname.toLowerCase()
    
    if (hostname.includes('substack.com')) return 'newsletter'
    if (hostname.includes('medium.com')) return 'blog'
    if (hostname.includes('dev.to')) return 'blog'
    if (hostname.includes('hashnode.')) return 'blog'
    if (hostname.includes('news.ycombinator.com')) return 'article'
    
    return 'unknown'
  }
  
  /**
   * Check if URL is from HackerNews
   */
  private static isHackerNewsUrl(url: string): boolean {
    return url.includes('news.ycombinator.com')
  }
  
  /**
   * Extract HackerNews story ID from URL
   */
  private static extractHackerNewsId(url: string): string | null {
    const match = url.match(/item\?id=(\d+)/)
    return match ? match[1] : null
  }
  
  /**
   * Clean and process extracted text
   */
  private static cleanAndProcessText(text: string): string {
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim()
    
    // Remove HTML entities if any leaked through
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
    
    // Remove excessive line breaks
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n')
    
    // Limit length for AI processing (keep first ~4000 chars for context)
    if (cleaned.length > 4000) {
      cleaned = cleaned.substring(0, 4000) + '...'
    }
    
    return cleaned
  }
  
  /**
   * Count words in text
   */
  private static countWords(text: string): number {
    return text.trim().split(/\s+/).length
  }
  
  /**
   * Process markdown content to plain text
   */
  static processMarkdown(markdown: string): string {
    // Convert markdown to HTML then strip HTML tags
    const html = marked(markdown)
    const text = html.replace(/<[^>]*>/g, ' ')
    return this.cleanAndProcessText(text)
  }
  
  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return url.startsWith('http://') || url.startsWith('https://')
    } catch {
      return false
    }
  }
}