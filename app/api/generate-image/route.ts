import { NextRequest, NextResponse } from 'next/server'
import { generateImage } from '@/domains/media/services/image-generation-api.service'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { prompt, type, model, provider } = await req.json()
    const result = await generateImage({ prompt, type, model, provider })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Image generation failed:', error)
    return NextResponse.json(
      { imageUrl: null, model: 'failed', provider: 'failed' },
      { status: 200 }
    )
  }
}
