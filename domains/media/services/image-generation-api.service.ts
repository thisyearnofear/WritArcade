export type BackendImageProvider = 'fal' | 'pollinations' | 'venice' | 'netmind' | 'modal' | 'failed'

export interface ImageGenerationPayload {
  prompt: string
  type: string
  model?: string
  provider?: string
}

export interface ImageGenerationApiResult {
  imageUrl: string | null
  model: string
  provider: BackendImageProvider | string
}

const IN_FLIGHT = new Map<string, Promise<ImageGenerationApiResult>>()
const providerHealth = {
  fal: { failures: 0, lastSuccess: Date.now() },
  pollinations: { failures: 0, lastSuccess: Date.now() },
  venice: { failures: 0, lastSuccess: Date.now() },
  netmind: { failures: 0, lastSuccess: Date.now() },
  modal: { failures: 0, lastSuccess: Date.now() },
}

function requestKey(prompt: string, model: string, provider: string) {
  return `${provider}::${model}::${prompt.slice(0, 200)}`
}

async function callPollinationsAPI(prompt: string): Promise<{ imageUrl: string | null; success: boolean }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 50000)
    const encodedPrompt = encodeURIComponent(prompt)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`
    const response = await fetch(imageUrl, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      providerHealth.pollinations.failures++
      return { imageUrl: null, success: false }
    }

    const blob = await response.blob()
    const buffer = await blob.arrayBuffer()
    providerHealth.pollinations.failures = 0
    providerHealth.pollinations.lastSuccess = Date.now()

    return {
      imageUrl: `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`,
      success: true,
    }
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) {
      console.error('[Pollinations] Request failed:', error)
    }
    providerHealth.pollinations.failures++
    return { imageUrl: null, success: false }
  }
}

async function callVeniceAPI(prompt: string, model: string): Promise<{ imageUrl: string | null; success: boolean }> {
  const apiKey = process.env.VENICE_API_KEY
  if (!apiKey) return { imageUrl: null, success: false }

  try {
    const response = await fetch('https://api.venice.ai/api/v1/image/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prompt, model, width: 1024, height: 1024, format: 'png' }),
    })

    if (!response.ok) {
      providerHealth.venice.failures += response.status === 402 ? 10 : 1
      return { imageUrl: null, success: false }
    }

    const data = await response.json()
    const imageUrl = data.images?.[0] ? `data:image/png;base64,${data.images[0]}` : null
    if (imageUrl) {
      providerHealth.venice.failures = 0
      providerHealth.venice.lastSuccess = Date.now()
    }
    return { imageUrl, success: !!imageUrl }
  } catch (error) {
    console.error('[Venice] Request failed:', error)
    providerHealth.venice.failures++
    return { imageUrl: null, success: false }
  }
}

async function callNetmindAPI(prompt: string, model: string): Promise<{ imageUrl: string | null; success: boolean }> {
  const apiKey = process.env.NETMIND_API_KEY
  if (!apiKey) return { imageUrl: null, success: false }

  try {
    const response = await fetch('https://api.netmind.ai/inference-api/openai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, prompt, response_format: 'b64_json' }),
    })

    if (!response.ok) {
      providerHealth.netmind.failures++
      return { imageUrl: null, success: false }
    }

    const data = await response.json()
    const imageUrl = data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null
    if (imageUrl) {
      providerHealth.netmind.failures = 0
      providerHealth.netmind.lastSuccess = Date.now()
    }
    return { imageUrl, success: !!imageUrl }
  } catch (error) {
    console.error('[Netmind] Request failed:', error)
    providerHealth.netmind.failures++
    return { imageUrl: null, success: false }
  }
}

async function callFalAIAPI(prompt: string): Promise<{ imageUrl: string | null; success: boolean }> {
  const apiKey = process.env.FAL_API_KEY
  if (!apiKey) return { imageUrl: null, success: false }
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        image_size: { width: 1280, height: 720 },
        num_inference_steps: 4,
      }),
    })
    clearTimeout(timeoutId)
    if (!response.ok) {
      providerHealth.fal.failures++
      return { imageUrl: null, success: false }
    }
    const data = await response.json()
    const imageUrl = data.images?.[0]?.url || null
    if (imageUrl) {
      providerHealth.fal.failures = 0
      providerHealth.fal.lastSuccess = Date.now()
    }
    return { imageUrl, success: !!imageUrl }
  } catch {
    providerHealth.fal.failures++
    return { imageUrl: null, success: false }
  }
}

async function callModalAPI(prompt: string): Promise<{ imageUrl: string | null; success: boolean }> {
  const modalUrl = process.env.MODAL_IMAGE_GEN_URL
  if (!modalUrl) return { imageUrl: null, success: false }

  try {
    const response = await fetch(modalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, width: 1024, height: 1024 }),
    })

    if (!response.ok) {
      providerHealth.modal.failures++
      return { imageUrl: null, success: false }
    }

    const data = await response.json()
    const imageUrl = data.image || null
    if (imageUrl) {
      providerHealth.modal.failures = 0
      providerHealth.modal.lastSuccess = Date.now()
    }
    return { imageUrl, success: !!imageUrl }
  } catch (error) {
    console.error('[Modal] Request failed:', error)
    providerHealth.modal.failures++
    return { imageUrl: null, success: false }
  }
}

function selectDefaultProvider() {
  if (process.env.FAL_API_KEY && providerHealth.fal.failures < 5) return 'fal'
  if (providerHealth.pollinations.failures < 10) return 'pollinations'
  if (process.env.VENICE_API_KEY && providerHealth.venice.failures < 5) return 'venice'
  if (process.env.NETMIND_API_KEY && providerHealth.netmind.failures < 5) return 'netmind'
  if (process.env.MODAL_IMAGE_GEN_URL && providerHealth.modal.failures < 5) return 'modal'
  return 'pollinations'
}

function defaultModelForProvider(provider: string) {
  if (provider === 'fal') return 'flux/schnell'
  if (provider === 'pollinations') return 'flux'
  if (provider === 'modal') return 'sdxl-turbo'
  if (provider === 'netmind') return 'black-forest-labs/FLUX.1-schnell'
  return 'venice-sd35'
}

export async function generateImage(payload: ImageGenerationPayload): Promise<ImageGenerationApiResult> {
  const { prompt, type, model, provider } = payload

  if (!prompt || !type) {
    throw new Error('Missing prompt or type')
  }

  const selectedProvider = provider || selectDefaultProvider()
  const selectedModel = model || defaultModelForProvider(selectedProvider)
  const key = requestKey(prompt, selectedModel, selectedProvider)
  const existing = IN_FLIGHT.get(key)
  if (existing) return existing

  const upstreamPromise = (async (): Promise<ImageGenerationApiResult> => {
    const callProvider = (providerName: string, providerModel: string) => {
      if (providerName === 'fal') return callFalAIAPI(prompt)
      if (providerName === 'pollinations') return callPollinationsAPI(prompt)
      if (providerName === 'venice') return callVeniceAPI(prompt, providerModel)
      if (providerName === 'modal') return callModalAPI(prompt)
      return callNetmindAPI(prompt, providerModel)
    }

    let result = await callProvider(selectedProvider, selectedModel)
    if (result.success && result.imageUrl) {
      return { imageUrl: result.imageUrl, model: selectedModel, provider: selectedProvider }
    }

    const fallbackChain = [
      { provider: 'fal', model: 'flux/schnell' },
      { provider: 'pollinations', model: 'flux' },
      { provider: 'venice', model: 'venice-sd35' },
      { provider: 'modal', model: 'sdxl-turbo' },
      { provider: 'netmind', model: 'black-forest-labs/FLUX.1-schnell' },
    ].filter((entry) => entry.provider !== selectedProvider)

    for (const fallback of fallbackChain) {
      result = await callProvider(fallback.provider, fallback.model)
      if (result.success && result.imageUrl) {
        return { imageUrl: result.imageUrl, model: fallback.model, provider: fallback.provider }
      }
    }

    return { imageUrl: null, model: selectedModel, provider: 'failed' }
  })()

  IN_FLIGHT.set(key, upstreamPromise)
  try {
    return await upstreamPromise
  } finally {
    IN_FLIGHT.delete(key)
  }
}
