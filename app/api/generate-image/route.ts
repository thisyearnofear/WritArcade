import { NextRequest, NextResponse } from 'next/server'

// ─── In-flight deduplication ──────────────────────────────────────────────
// React StrictMode double-invokes effects in development, which can trigger
// two identical image generation requests back-to-back — each costing real
// API credits. This Map coalesces concurrent identical requests so
// only one upstream call is made; both callers receive the same result.
const IN_FLIGHT = new Map<string, Promise<{ imageUrl: string | null; model: string; provider: string }>>()

function requestKey(prompt: string, model: string, provider: string) {
  // Simple deterministic key — no crypto needed for this use-case
  return `${provider}::${model}::${prompt.slice(0, 200)}`
}
// ─────────────────────────────────────────────────────────────────────────

/**
 * Call Venice AI image generation API
 */
async function callVeniceAPI(prompt: string, model: string): Promise<{ imageUrl: string | null; success: boolean }> {
  const apiKey = process.env.VENICE_API_KEY
  if (!apiKey) {
    return { imageUrl: null, success: false }
  }

  try {
    const response = await fetch('https://api.venice.ai/api/v1/image/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        model,
        width: 1024,
        height: 1024,
        format: 'png',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Venice] API error:', response.status, errorText)
      
      if (response.status === 402) {
        console.warn('[Venice] Credits exhausted - will use fallback provider')
      }
      
      return { imageUrl: null, success: false }
    }

    const data = await response.json()
    const imageUrl = data.images?.[0] ? `data:image/png;base64,${data.images[0]}` : null
    
    return { imageUrl, success: true }
  } catch (error) {
    console.error('[Venice] Request failed:', error)
    return { imageUrl: null, success: false }
  }
}

/**
 * Call Netmind AI image generation API (OpenAI-compatible)
 */
async function callNetmindAPI(prompt: string, model: string): Promise<{ imageUrl: string | null; success: boolean }> {
  const apiKey = process.env.NETMIND_API_KEY
  if (!apiKey) {
    return { imageUrl: null, success: false }
  }

  try {
    const response = await fetch('https://api.netmind.ai/inference-api/openai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        response_format: 'b64_json',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Netmind] API error:', response.status, errorText)
      return { imageUrl: null, success: false }
    }

    const data = await response.json()
    const imageUrl = data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null
    
    return { imageUrl, success: true }
  } catch (error) {
    console.error('[Netmind] Request failed:', error)
    return { imageUrl: null, success: false }
  }
}

/**
 * Call Modal Stable Diffusion API (self-hosted)
 */
async function callModalAPI(prompt: string): Promise<{ imageUrl: string | null; success: boolean }> {
  const modalUrl = process.env.MODAL_IMAGE_GEN_URL
  if (!modalUrl) {
    console.warn('[Modal] MODAL_IMAGE_GEN_URL not configured')
    return { imageUrl: null, success: false }
  }

  try {
    const response = await fetch(modalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        width: 512,
        height: 512,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Modal] API error:', response.status, errorText)
      return { imageUrl: null, success: false }
    }

    const data = await response.json()
    const imageUrl = data.image || null
    
    return { imageUrl, success: !!imageUrl }
  } catch (error) {
    console.error('[Modal] Request failed:', error)
    return { imageUrl: null, success: false }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, type, model, provider } = await req.json()

    if (!prompt || !type) {
      return NextResponse.json(
        { error: 'Missing prompt or type' },
        { status: 400 }
      )
    }

    // Determine provider (default to modal, fallback chain: modal -> netmind -> venice)
    // Venice is tertiary because it runs out of credits quickly
    const selectedProvider = provider || 'modal'
    
    // Use specified model or default based on provider
    let selectedModel = model
    if (!selectedModel) {
      if (selectedProvider === 'modal') selectedModel = 'stable-diffusion-v1-5'
      else if (selectedProvider === 'netmind') selectedModel = 'black-forest-labs/FLUX.1-schnell'
      else selectedModel = 'venice-sd35'
    }
    
    const key = requestKey(prompt, selectedModel, selectedProvider)

    // Deduplicate: if an identical request is already in flight, share its result
    const existing = IN_FLIGHT.get(key)
    if (existing) {
      console.log(`[generate-image] Deduplicating in-flight request for key: ${key.slice(0, 60)}`)
      const result = await existing
      return NextResponse.json(result)
    }

    // Create the upstream request promise and register it
    const upstreamPromise = (async (): Promise<{ imageUrl: string | null; model: string; provider: string }> => {
      console.log(`[Image] Generating with ${selectedProvider} / ${selectedModel}`)
      
      // Try primary provider
      let result: { imageUrl: string | null; success: boolean; status?: number }
      if (selectedProvider === 'venice') {
        result = await callVeniceAPI(prompt, selectedModel)
        // Explicitly check for 402 if our API helper allows returning status
        // Venice returns a 402 if credits are exhausted
      } else if (selectedProvider === 'modal') {
        result = await callModalAPI(prompt)
      } else {
        result = await callNetmindAPI(prompt, selectedModel)
      }
      
      if (result.success && result.imageUrl) {
        console.log(`[Image] Primary provider ${selectedProvider} succeeded.`)
        return { imageUrl: result.imageUrl, model: selectedModel, provider: selectedProvider }
      }
      console.log(`[Image] Primary provider ${selectedProvider} failed.`)
      
      // Fallback chain: modal -> netmind -> venice (venice last, runs out of credits)
      const fallbackChain: Array<{ provider: string; model: string; call: () => Promise<{ imageUrl: string | null; success: boolean }> }> = [
        { provider: 'modal', model: 'stable-diffusion-v1-5', call: () => callModalAPI(prompt) },
        { provider: 'netmind', model: 'black-forest-labs/FLUX.1-schnell', call: () => callNetmindAPI(prompt, 'black-forest-labs/FLUX.1-schnell') },
        { provider: 'venice', model: 'venice-sd35', call: () => callVeniceAPI(prompt, 'venice-sd35') },
      ].filter(f => f.provider !== selectedProvider) // Skip the one we already tried

      for (const fallback of fallbackChain) {
        console.log(`[Image] Trying fallback: ${fallback.provider} / ${fallback.model}`)
        result = await fallback.call()
        if (result.success && result.imageUrl) {
          console.log(`[Image] Fallback ${fallback.provider} succeeded.`)
          return { imageUrl: result.imageUrl, model: fallback.model, provider: fallback.provider }
        }
        console.log(`[Image] Fallback ${fallback.provider} failed.`)
      }
      
      // All providers failed
      console.error('[Image] All providers failed.')
      return { imageUrl: null, model: selectedModel, provider: 'failed' }
    })()

    IN_FLIGHT.set(key, upstreamPromise)

    try {
      const result = await upstreamPromise
      return NextResponse.json(result)
    } finally {
      // Always clean up so a future retry can start fresh
      IN_FLIGHT.delete(key)
    }
  } catch (error) {
    console.error('Image generation failed:', error)
    return NextResponse.json(
      { imageUrl: null, model: 'failed', provider: 'failed' },
      { status: 200 }
    )
  }
}
