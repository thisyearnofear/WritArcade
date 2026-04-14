import { NextRequest, NextResponse } from 'next/server'

// Vercel serverless function timeout (max 60s on Hobby plan)
export const maxDuration = 60

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
 * Call Pollinations.ai (Free, no API key required)
 * This is a completely free service that doesn't require authentication
 */
async function callPollinationsAPI(prompt: string): Promise<{ imageUrl: string | null; success: boolean }> {
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 50000) // 50s timeout

    // Pollinations.ai provides a simple URL-based API
    // The image is generated on-demand when you request the URL
    const encodedPrompt = encodeURIComponent(prompt)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`
    
    // Fetch the image and convert to base64 for consistency with other providers
    const response = await fetch(imageUrl, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error('[Pollinations] Image generation failed:', response.status)
      return { imageUrl: null, success: false }
    }

    // Convert to base64 for consistency with other providers
    const blob = await response.blob()
    const buffer = await blob.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const base64Url = `data:image/jpeg;base64,${base64}`
    
    console.log('[Pollinations] Image generated successfully')
    return { imageUrl: base64Url, success: true }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Pollinations] Request timeout after 50s')
    } else {
      console.error('[Pollinations] Request failed:', error)
    }
    return { imageUrl: null, success: false }
  }
}

/**
 * Call Venice AI image generation API
 */
async function callVeniceAPI(prompt: string, model: string): Promise<{ imageUrl: string | null; success: boolean }> {
  const apiKey = process.env.VENICE_API_KEY
  if (!apiKey) {
    return { imageUrl: null, success: false }
  }

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 50000) // 50s timeout

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
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

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
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Venice] Request timeout after 50s')
    } else {
      console.error('[Venice] Request failed:', error)
    }
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
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 50000) // 50s timeout

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
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Netmind] API error:', response.status, errorText)
      return { imageUrl: null, success: false }
    }

    const data = await response.json()
    const imageUrl = data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null
    
    return { imageUrl, success: true }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Netmind] Request timeout after 50s')
    } else {
      console.error('[Netmind] Request failed:', error)
    }
    return { imageUrl: null, success: false }
  }
}

/**
 * Call Hugging Face Inference Providers API
 * Note: The old api-inference.huggingface.co endpoint is deprecated (returns 410).
 * HuggingFace now uses inference providers for better reliability and performance.
 * This requires the @huggingface/inference SDK or direct provider API calls.
 * 
 * Since we can't use the SDK in this serverless function without adding dependencies,
 * we'll disable this provider for now. Alternative: Use Replicate, Together AI, or other providers.
 */
async function callHuggingFaceAPI(prompt: string): Promise<{ imageUrl: string | null; success: boolean }> {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) {
    console.warn('[HuggingFace] HUGGINGFACE_API_KEY not configured')
    return { imageUrl: null, success: false }
  }

  // HuggingFace deprecated their old serverless inference API in 2026
  // The new API requires using their SDK or going through inference providers
  // For now, we'll return false and rely on other providers
  console.warn('[HuggingFace] Old API deprecated. Use @huggingface/inference SDK or alternative providers.')
  return { imageUrl: null, success: false }
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
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 55000) // 55s timeout (Vercel has 60s limit)

    const response = await fetch(modalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        width: 1024,
        height: 1024,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Modal] API error:', response.status, errorText)
      return { imageUrl: null, success: false }
    }

    const data = await response.json()
    const imageUrl = data.image || null
    
    return { imageUrl, success: !!imageUrl }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Modal] Request timeout after 55s')
    } else {
      console.error('[Modal] Request failed:', error)
    }
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

    // Determine provider (default to pollinations)
    // Primary: Pollinations (free, no API key, reliable)
    // Fallback chain: pollinations -> venice -> (netmind/modal if configured)
    const selectedProvider = provider || 'pollinations'
    
    // Use specified model or default based on provider
    let selectedModel = model
    if (!selectedModel) {
      if (selectedProvider === 'pollinations') selectedModel = 'flux'
      else if (selectedProvider === 'modal') selectedModel = 'sdxl-turbo'
      else if (selectedProvider === 'netmind') selectedModel = 'black-forest-labs/FLUX.1-schnell'
      else if (selectedProvider === 'venice') selectedModel = 'venice-sd35'
      else selectedModel = 'flux'
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
      if (selectedProvider === 'pollinations') {
        result = await callPollinationsAPI(prompt)
      } else if (selectedProvider === 'venice') {
        result = await callVeniceAPI(prompt, selectedModel)
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
      
      // Fallback chain: pollinations -> venice -> (netmind/modal if configured)
      // Pollinations first (free, no API key), Venice second (works, has credits)
      const fallbackChain: Array<{ provider: string; model: string; call: () => Promise<{ imageUrl: string | null; success: boolean }> }> = [
        { provider: 'pollinations', model: 'flux', call: () => callPollinationsAPI(prompt) },
        { provider: 'venice', model: 'venice-sd35', call: () => callVeniceAPI(prompt, 'venice-sd35') },
        { provider: 'modal', model: 'sdxl-turbo', call: () => callModalAPI(prompt) },
        { provider: 'netmind', model: 'black-forest-labs/FLUX.1-schnell', call: () => callNetmindAPI(prompt, 'black-forest-labs/FLUX.1-schnell') },
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
