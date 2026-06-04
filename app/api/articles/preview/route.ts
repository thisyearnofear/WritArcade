import { NextRequest, NextResponse } from 'next/server'
import { ContentProcessorService } from '@/domains/content/services/content-processor.service'
import { getWriterCoinByArticleUrl, validateArticleUrl } from '@/lib/writerCoins'
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
      return NextResponse.json(
        { success: false, error: 'Please enter a valid public article URL.' },
        { status: 400 }
      )
    }

    if (paymentPath === 'writercoin' && writerCoinId && !validateArticleUrl(url, writerCoinId)) {
      const detectedWriterCoin = getWriterCoinByArticleUrl(url)
      return NextResponse.json(
        {
          success: false,
          error: detectedWriterCoin
            ? `This article belongs to ${detectedWriterCoin.name}. Use ${detectedWriterCoin.symbol}, or switch to MUSD for any public Paragraph article.`
            : 'This URL does not match the selected writer. Switch to MUSD for any Paragraph article, or choose the matching writer coin.',
          detectedWriterCoin: detectedWriterCoin
            ? {
                id: detectedWriterCoin.id,
                name: detectedWriterCoin.name,
                symbol: detectedWriterCoin.symbol,
              }
            : undefined,
        },
        { status: 400 }
      )
    }

    const content = await ContentProcessorService.processUrl(url)
    const excerpt = content.text.length > 220
      ? `${content.text.slice(0, 220).trim()}...`
      : content.text

    return NextResponse.json({
      success: true,
      data: {
        title: content.title || 'Untitled article',
        author: content.author || 'Unknown author',
        publicationName: content.publicationName,
        publishedAt: content.publishedAt?.toISOString(),
        wordCount: content.wordCount,
        estimatedReadTime: content.estimatedReadTime,
        excerpt,
        sourceUrl: url,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not preview this article.'
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
