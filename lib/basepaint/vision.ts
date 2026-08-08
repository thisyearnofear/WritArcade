import { getBasePaintCanvasUrl } from '@/lib/basepaint/urls'

/**
 * Describe what is drawn on a canvas using a vision-capable model.
 * Server-only — returns null when no provider is configured.
 */
export async function describeBasePaintCanvas(day: number): Promise<string | null> {
  try {
    const response = await fetch(getBasePaintCanvasUrl(day))
    if (!response.ok) return null

    const mimeType = response.headers.get('content-type') || 'image/png'
    const image = new Uint8Array(await response.arrayBuffer())
    if (image.length === 0) return null

    const { generateText } = await import('ai')
    const { getCompatibleGoogleModel, getCompatibleOpenAIModel } = await import(
      '@/lib/ai-model-compatibility'
    )

    const model = process.env.GOOGLE_API_KEY
      ? getCompatibleGoogleModel('gemini-2.0-flash')
      : process.env.OPENAI_API_KEY
        ? getCompatibleOpenAIModel('gpt-4o-mini')
        : null
    if (!model) {
      console.warn('[BasePaint] No vision provider configured (GOOGLE_API_KEY / OPENAI_API_KEY)')
      return null
    }

    const { text } = await generateText({
      model,
      maxTokens: 220,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'This is a collaborative pixel-art canvas drawn by many people on one shared theme. ' +
                'Describe what is concretely drawn: main subjects, objects, characters, scenes, ' +
                'their spatial arrangement, and the overall mood. Use concrete nouns, no speculation. ' +
                '3-5 sentences.',
            },
            { type: 'image', image, mimeType },
          ],
        },
      ],
    })

    const description = text.trim()
    return description || null
  } catch (err) {
    console.error('[BasePaint] Canvas vision description failed:', err)
    return null
  }
}

const canvasDescriptionCache = new Map<number, Promise<string | null>>()

export function getBasePaintCanvasDescription(day: number): Promise<string | null> {
  let pending = canvasDescriptionCache.get(day)
  if (!pending) {
    pending = describeBasePaintCanvas(day)
    canvasDescriptionCache.set(day, pending)
    if (canvasDescriptionCache.size > 14) {
      const oldest = canvasDescriptionCache.keys().next().value
      if (oldest !== undefined) canvasDescriptionCache.delete(oldest)
    }
  }
  return pending
}
