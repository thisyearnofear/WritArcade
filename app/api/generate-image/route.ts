import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { prompt, type } = await req.json()

    if (!prompt || !type) {
      return NextResponse.json(
        { error: 'Missing prompt or type' },
        { status: 400 }
      )
    }

    const apiKey = process.env.VENICE_API_KEY

    if (!apiKey) {
      console.warn('Venice API key not configured')
      return NextResponse.json(
        { imageUrl: null },
        { status: 200 }
      )
    }

    const response = await fetch('https://api.venice.ai/api/v1/image/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        model: 'venice-sd35',
        width: 1024,
        height: 1024,
        format: 'png',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Venice API error:', response.status, errorText)
      return NextResponse.json(
        { imageUrl: null },
        { status: 200 }
      )
    }

    const data = await response.json()

    if (data.images?.[0]) {
      const imageUrl = `data:image/png;base64,${data.images[0]}`
      return NextResponse.json({ imageUrl })
    }

    console.warn('Venice API response missing images array:', data)
    return NextResponse.json(
      { imageUrl: null },
      { status: 200 }
    )
  } catch (error) {
    console.error('Image generation failed:', error)
    return NextResponse.json(
      { imageUrl: null },
      { status: 200 }
    )
  }
}
