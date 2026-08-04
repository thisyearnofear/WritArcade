/**
 * Video Generation Service
 *
 * Provider-agnostic image-to-video (I2V) generation. Supports multiple backends
 * via a simple registry/factory pattern.
 *
 * Usage:
 *   const result = await VideoGenerationService.generate({
 *     imageUrl: panel.imageUrl,
 *     narrative: panel.narrativeText,
 *     genre: game.genre,
 *   })
 *   const status = await VideoGenerationService.poll(jobId, providerName)
 */

import { prisma } from '@/lib/prisma'

export type VideoProviderName = 'luma' | 'fal' | 'replicate' | 'mock' | 'failed'

export type VideoGenerationStatus = 'idle' | 'pending' | 'completed' | 'failed'

export interface VideoGenerationResult {
  provider: VideoProviderName
  providerJobId: string | null
  status: VideoGenerationStatus
  videoUrl: string | null
  model: string
  error?: string
}

export interface VideoGenerationRequest {
  imageUrl: string
  narrative: string
  genre: string
  panelIndex: number
  primaryColor?: string
  providerOverride?: VideoProviderName
  style?: VideoStyle
}

export type VideoStyle = 'cinematic' | 'loop' | 'subtle' | 'dynamic'

export const VIDEO_STYLE_LABELS: Record<VideoStyle, string> = {
  cinematic: 'Cinematic',
  loop: 'Seamless Loop',
  subtle: 'Subtle Motion',
  dynamic: 'Dynamic Action',
}

export interface VideoProvider {
  name: VideoProviderName
  createJob(req: VideoGenerationRequest): Promise<VideoGenerationResult>
  poll(jobId: string): Promise<VideoGenerationResult>
}

function buildMotionPrompt(req: VideoGenerationRequest): string {
  const style = req.style ?? 'cinematic'

  const styleMotion: Record<VideoStyle, string> = {
    cinematic: 'slow cinematic camera drift, gentle dolly, dramatic lighting, preserve the scene',
    loop: 'seamless looping motion, gentle ambient movement, no cuts, preserve the scene',
    subtle: 'very subtle atmospheric motion, slight parallax, preserve the scene',
    dynamic: 'dynamic camera movement, expressive environmental motion, energetic but smooth, preserve the scene',
  }

  const genreMotion: Record<string, string> = {
    horror: 'moody cinematic lighting, eerie atmosphere',
    mystery: 'dramatic shadows, noir pan',
    comedy: 'light atmosphere, playful motion',
    adventure: 'cinematic dolly, environmental motion',
    'sci-fi': 'neon glow pulse, futuristic atmosphere',
    fantasy: 'magical particle motion, ethereal atmosphere',
  }

  const genre = genreMotion[req.genre.toLowerCase()] || 'cinematic atmosphere'
  const motion = styleMotion[style] ?? styleMotion.cinematic
  return `${motion}. ${genre}. No text, no speech bubbles, no typography. Short clip.`
}

/**
 * Luma Dream Machine I2V provider.
 * Docs: https://api.lumalabs.ai/dream-machine/v1
 */
export class LumaProvider implements VideoProvider {
  name: 'luma' = 'luma'
  private readonly apiKey: string | undefined
  private readonly model: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey ?? process.env.LUMA_API_KEY
    this.model = model ?? process.env.LUMA_VIDEO_MODEL ?? 'ray-2'
  }

  async createJob(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) throw new Error('Missing Luma API key')

    const response = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        prompt: buildMotionPrompt(req),
        model: 'ray-2',
        aspect_ratio: '16:9',
        keyframes: {
          frame0: {
            type: 'image',
            url: req.imageUrl,
          },
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Luma create generation failed: ${response.status} ${text}`)
    }

    const data = (await response.json()) as { id: string; state: string }
    return {
      provider: 'luma',
      providerJobId: data.id,
      status: mapLumaState(data.state),
      videoUrl: null,
      model: this.model,
    }
  }

  async poll(jobId: string): Promise<VideoGenerationResult> {
    if (!this.apiKey) throw new Error('Missing Luma API key')

    const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Luma poll generation failed: ${response.status} ${text}`)
    }

    const data = (await response.json()) as {
      id: string
      state: string
      failure_reason?: string | null
      assets?: { video?: string } | null
    }

    return {
      provider: 'luma',
      providerJobId: data.id,
      status: mapLumaState(data.state),
      videoUrl: data.assets?.video ?? null,
      model: this.model,
      error: data.failure_reason ?? undefined,
    }
  }
}

function mapLumaState(state: string): VideoGenerationStatus {
  switch (state) {
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'dreaming':
    case 'queued':
      return 'pending'
    default:
      return 'pending'
  }
}

/**
 * Fal.ai I2V provider.
 * Docs: https://docs.fal.ai/
 */
export class FalProvider implements VideoProvider {
  name: 'fal' = 'fal'
  private readonly apiKey: string | undefined
  private readonly model: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey ?? process.env.FAL_KEY
    this.model = model ?? process.env.FAL_VIDEO_MODEL ?? 'fal-ai/stable-video-diffusion'
  }

  async createJob(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) throw new Error('Missing Fal API key')

    const response = await fetch(`https://queue.fal.run/${this.model}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Key ${this.apiKey}`,
      },
      body: JSON.stringify({
        image_url: req.imageUrl,
        prompt: buildMotionPrompt(req),
        aspect_ratio: '16:9',
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Fal create generation failed: ${response.status} ${text}`)
    }

    const data = (await response.json()) as { request_id: string; status?: string }
    return {
      provider: 'fal',
      providerJobId: data.request_id,
      status: mapFalState(data.status),
      videoUrl: null,
      model: this.model,
    }
  }

  async poll(jobId: string): Promise<VideoGenerationResult> {
    if (!this.apiKey) throw new Error('Missing Fal API key')

    const response = await fetch(`https://queue.fal.run/${this.model}/requests/${jobId}/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Key ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Fal poll generation failed: ${response.status} ${text}`)
    }

    const data = (await response.json()) as {
      status: string
      error?: string | null
      video?: { url?: string } | null
    }

    return {
      provider: 'fal',
      providerJobId: jobId,
      status: mapFalState(data.status),
      videoUrl: data.video?.url ?? null,
      model: this.model,
      error: data.error ?? undefined,
    }
  }
}

function mapFalState(state?: string): VideoGenerationStatus {
  switch (state?.toLowerCase()) {
    case 'completed':
    case 'success':
      return 'completed'
    case 'failed':
    case 'error':
      return 'failed'
    case 'queued':
    case 'in_progress':
    case 'processing':
    default:
      return 'pending'
  }
}

/**
 * Replicate I2V provider.
 * Docs: https://replicate.com/docs
 */
export class ReplicateProvider implements VideoProvider {
  name: 'replicate' = 'replicate'
  private readonly apiKey: string | undefined
  private readonly model: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey ?? process.env.REPLICATE_API_TOKEN
    this.model = model ?? process.env.REPLICATE_VIDEO_MODEL ?? 'luma/ray-2'
  }

  async createJob(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) throw new Error('Missing Replicate API token')

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        version: this.model,
        input: {
          prompt: buildMotionPrompt(req),
          image: req.imageUrl,
          duration: 5,
          aspect_ratio: '16:9',
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Replicate create prediction failed: ${response.status} ${text}`)
    }

    const data = (await response.json()) as { id: string; status: string }
    return {
      provider: 'replicate',
      providerJobId: data.id,
      status: mapReplicateState(data.status),
      videoUrl: null,
      model: this.model,
    }
  }

  async poll(jobId: string): Promise<VideoGenerationResult> {
    if (!this.apiKey) throw new Error('Missing Replicate API token')

    const response = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Replicate poll prediction failed: ${response.status} ${text}`)
    }

    const data = (await response.json()) as {
      id: string
      status: string
      error?: string | null
      output?: string | string[] | null
    }

    const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output ?? null

    return {
      provider: 'replicate',
      providerJobId: data.id,
      status: mapReplicateState(data.status),
      videoUrl,
      model: this.model,
      error: data.error ?? undefined,
    }
  }
}

function mapReplicateState(state: string): VideoGenerationStatus {
  switch (state) {
    case 'succeeded':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'canceled':
      return 'failed'
    case 'starting':
    case 'processing':
      return 'pending'
    default:
      return 'pending'
  }
}

/**
 * Mock provider that returns a synthetic video after a short delay.
 */
export class MockProvider implements VideoProvider {
  name: 'mock' = 'mock'

  async createJob(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const providerJobId = `mock-${req.panelIndex}-${Date.now()}`
    return {
      provider: 'mock',
      providerJobId,
      status: 'pending',
      videoUrl: null,
      model: 'mock',
    }
  }

  async poll(jobId: string): Promise<VideoGenerationResult> {
    const createdAt = Number(jobId.split('-')[2]) || Date.now()
    const elapsed = Date.now() - createdAt
    if (elapsed < 30000) {
      return {
        provider: 'mock',
        providerJobId: jobId,
        status: 'pending',
        videoUrl: null,
        model: 'mock',
      }
    }

    return {
      provider: 'mock',
      providerJobId: jobId,
      status: 'completed',
      videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
      model: 'mock',
    }
  }
}

/**
 * Provider registry and factory.
 */
class ProviderRegistry {
  private providers = new Map<VideoProviderName, VideoProvider>()

  constructor() {
    this.register(new LumaProvider())
    this.register(new FalProvider())
    this.register(new ReplicateProvider())
    this.register(new MockProvider())
  }

  register(provider: VideoProvider): void {
    this.providers.set(provider.name, provider)
  }

  get(name: VideoProviderName): VideoProvider | undefined {
    return this.providers.get(name)
  }

  getDefault(): VideoProvider {
    const envProvider = process.env.VIDEO_PROVIDER as VideoProviderName | undefined
    if (envProvider) {
      const provider = this.providers.get(envProvider)
      if (provider) {
        console.log(`[ProviderRegistry] Using VIDEO_PROVIDER=${envProvider}`)
        return provider
      }
      console.warn(`[ProviderRegistry] VIDEO_PROVIDER=${envProvider} not recognized; falling back`)
    }

    // When no explicit provider is set, pick the first provider with a configured key.
    if (process.env.LUMA_API_KEY) return this.providers.get('luma')!
    if (process.env.FAL_KEY) return this.providers.get('fal')!
    if (process.env.REPLICATE_API_TOKEN) return this.providers.get('replicate')!

    console.warn('[ProviderRegistry] No video API keys present; using mock provider')
    return this.providers.get('mock')!
  }
}

export const videoProviderRegistry = new ProviderRegistry()

export class VideoGenerationService {
  static async generate(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
    try {
      const provider = req.providerOverride
        ? videoProviderRegistry.get(req.providerOverride)
        : videoProviderRegistry.getDefault()

      if (!provider) {
        throw new Error(`Provider ${req.providerOverride} not found in registry`)
      }

      return await provider.createJob(req)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Video generation failed'
      console.error('[VideoGenerationService] createJob error:', message)
      return {
        provider: 'failed',
        providerJobId: null,
        status: 'failed',
        videoUrl: null,
        model: 'unknown',
        error: message,
      }
    }
  }

  static async poll(providerJobId: string, providerName: VideoProviderName): Promise<VideoGenerationResult> {
    try {
      const provider = videoProviderRegistry.get(providerName)
      if (!provider) {
        throw new Error(`Provider ${providerName} not found in registry`)
      }

      return await provider.poll(providerJobId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Video poll failed'
      console.error('[VideoGenerationService] poll error:', message)
      return {
        provider: 'failed',
        providerJobId,
        status: 'failed',
        videoUrl: null,
        model: 'unknown',
        error: message,
      }
    }
  }
}


