import axios from 'axios'
import { marked } from 'marked'
import { processArticleFromUrl, fetchPublicationBySlug, parseParagraphUrl } from '@/lib/paragraph-sdk'


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
  authorWallet?: string
  publishedAt?: Date
  publicationName?: string
  publicationSummary?: string
  subscriberCount?: number
  wordCount: number
  estimatedReadTime: number
  source: ContentSource
}

/**
 * Content Processing Service - Paragraph.xyz only
 */
export class ContentProcessorService {
  
  /**
    * Process content from Paragraph.xyz URL
    */
  static async processUrl(url: string): Promise<ProcessedContent> {
    try {
      // Validate URL format first
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL format. Please ensure the URL starts with http:// or https://')
      }

      // Normalize custom domain URLs to Paragraph format
      const normalizedUrl = this.normalizeCustomDomainUrl(url)

      // Detect content type from original URL
      const contentType = this.detectContentType(url)

      // Extract content from Paragraph
      let extractedData: { text: string; metadata: Partial<ProcessedContent> }
      extractedData = await this.scrapeGenericUrl(normalizedUrl)
      
      const extractedText = extractedData.text
      const metadata = extractedData.metadata || {}
      
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
      
      // Provide specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('Invalid URL')) {
          throw error
        }
        if (error.message.includes('Paragraph')) {
          throw new Error('Only Paragraph.xyz URLs are supported.')
        }
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          throw new Error('The URL took too long to load. The website might be down or blocking our access.')
        }
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          throw new Error('This URL does not exist or is no longer accessible. Please check the link.')
        }
        throw new Error(`Failed to extract content from URL. ${error.message}`)
      }
      
      throw new Error('Failed to process content from URL. Please check that the URL is valid and publicly accessible.')
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
   * Enhanced URL scraping with SDK integration
   */
  private static async scrapeGenericUrl(url: string): Promise<{ text: string; metadata: Partial<ProcessedContent> }> {
    if (!url.includes('paragraph')) {
      throw new Error('Only Paragraph URLs supported');
    }

    try {
      // Use the SDK to process the article
      const article = await processArticleFromUrl(url);
      
      if (!article) {
        throw new Error('Failed to process article');
      }

      const metadata: Partial<ProcessedContent> = {
        title: article.title,
        author: article.author,
        authorWallet: article.authorWallet,
        publishedAt: article.publishedAt,
        publicationName: article.source.publicationName,
        publicationSummary: article.publicationSummary,
        subscriberCount: article.subscriberCount,
      };

      return { text: article.plainText, metadata };
    } catch (error) {
      console.error('Paragraph API error:', error);
      throw new Error('Failed to extract content and metadata from Paragraph API');
    }
  }
  
  /**
   * Detect content type - Paragraph only
   */
  private static detectContentType(url: string): ContentSource['type'] {
    const hostname = new URL(url).hostname.toLowerCase()
    
    if (hostname.includes('paragraph')) return 'newsletter'
    
    return 'unknown'
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
  static async processMarkdown(markdown: string): Promise<string> {
    // Convert markdown to HTML then strip HTML tags
    const html = await marked(markdown)
    const text = html.replace(/<[^>]*>/g, ' ')
    return this.cleanAndProcessText(text)
  }
  
  /**
    * Normalize custom domain URLs to Paragraph.xyz format
    * Converts URLs like https://avc.xyz/post-slug to https://paragraph.xyz/@avc/post-slug
    */
  private static normalizeCustomDomainUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      const pathname = urlObj.pathname

      // Map of known custom domains to their Paragraph publication slugs
      const customDomainMap: Record<string, string> = {
        'avc.xyz': 'avc',
        'eriktorenberg.substack.com': 'eriktorenberg',
        // Add more mappings as needed
      }

      // Check if this is a custom domain
      for (const [domain, pubSlug] of Object.entries(customDomainMap)) {
        if (hostname === domain) {
          // Extract the post slug from the path (remove leading slash)
          const postSlug = pathname.slice(1).split('/')[0]
          if (postSlug) {
            return `https://paragraph.xyz/@${pubSlug}/${postSlug}`
          }
        }
      }

      // Return original URL if no custom domain mapping found
      return url
    } catch {
      return url
    }
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