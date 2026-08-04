import { NextRequest } from 'next/server'
import { ContentProcessorService } from '@/domains/content/services/content-processor.service'
import { getWriterCoinByArticleUrl, validateArticleUrl } from '@/lib/writerCoins'
import { ok, fail } from '@/lib/api-response'
import { z } from 'zod'

const previewSchema = z.object({
  url: z.string().url(),
  paymentPath: z.enum(['musd', 'writercoin']).optional(),
  writerCoinId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, paymentPath = 'musd', writerCoinId } = previewSchema.parse(body)

    if (!ContentProcessorService.isValidUrl(url)) {
      return fail('Please enter a valid public article URL.')
    }

    if (paymentPath === 'writercoin' && writerCoinId && !validateArticleUrl(url, writerCoinId)) {
      const detectedWriterCoin = getWriterCoinByArticleUrl(url)
      return fail(
        detectedWriterCoin
          ? `This article belongs to ${detectedWriterCoin.name}. Use ${detectedWriterCoin.symbol}, or switch to MUSD for any public Paragraph article.`
          : 'This URL does not match the selected writer. Switch to MUSD for any Paragraph article, or choose the matching writer coin.',
        400,
        { code: 'ARTICLE_WRITER_MISMATCH' },
      )
    }

    const content = await ContentProcessorService.processUrl(url)
    const excerpt = content.text.length > 220
      ? `${content.text.slice(0, 220).trim()}...`
      : content.text

    return ok({
      title: content.title || 'Untitled article',
      author: content.author || 'Unknown author',
      publicationName: content.publicationName,
      publishedAt: content.publishedAt?.toISOString(),
      wordCount: content.wordCount,
      estimatedReadTime: content.estimatedReadTime,
      excerpt,
      sourceUrl: url,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail('Invalid request data', 400, { details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`) })
    }
    const message = error instanceof Error ? error.message : 'Could not preview this article.'
    return fail(message, 400)
  }
}
