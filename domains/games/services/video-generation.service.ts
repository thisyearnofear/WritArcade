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

import { randomUUID } from 'node:crypto'
import {
  type VideoAspectRatio,
  type VideoGenerationRequest,
  type VideoGenerationResult,
  type VideoGenerationStatus,
  type VideoProviderName,
  type VideoStyle,
} from './video-generation.types'

export type {
  VideoAspectRatio,
  VideoGenerationRequest,
  VideoGenerationResult,
  VideoGenerationStatus,
  VideoProviderName,
  VideoStyle,
} from './video-generation.types'

export { VIDEO_STYLE_LABELS, VIDEO_ASPECT_RATIO_LABELS } from './video-generation.types'

const VIDEO_REQUEST_TIMEOUT_MS = 20_000

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), VIDEO_REQUEST_TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

function isRetryablePollError(message: string): boolean {
  if (/aborted|timeout|timed out|fetch failed|network/i.test(message)) return true
  const status = message.match(/failed:\s*(\d{3})/i)?.[1]
  if (!status) return false
  const statusCode = Number(status)
  return statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500
}

export function getVideoDurationSeconds(): number {
  const configuredDuration = Number(process.env.RUNWARE_VIDEO_DURATION || 5)
  return Number.isFinite(configuredDuration)
    ? Math.min(8, Math.max(3, configuredDuration))
    : 5
}

/**
 * Native output ratio for a job. Defaults to vertical 9:16 (the documented
 * social hero format). Video should be generated at its native ratio rather
 * than cropped after upload — cropping a wide clip for Stories cuts the object.
 */
export function resolveAspectRatio(
  req: { aspectRatio?: VideoAspectRatio },
): string {
  return req.aspectRatio ?? '9:16'
}

export interface VideoProvider {
  name: VideoProviderName
  createJob(req: VideoGenerationRequest): Promise<VideoGenerationResult>
  poll(jobId: string): Promise<VideoGenerationResult>
}

/**
 * Runware unified video inference provider.
 * Docs: https://runware.ai/docs/models/klingai-video-3-0-standard
 *
 * Runware tasks are asynchronous. The provider job id is the Runware task UUID;
 * status polling uses the platform's getResponse task.
 */
export class RunwareProvider implements VideoProvider {
  readonly name = 'runware' as const
  private readonly apiKey: string | undefined
  private readonly model: string
  private readonly duration: number

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey ?? process.env.RUNWARE_API_KEY
    this.model = model ?? process.env.RUNWARE_VIDEO_MODEL ?? 'klingai:kling-video@3-standard'
    this.duration = getVideoDurationSeconds()
  }

  async createJob(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) throw new Error('Missing Runware API key')

    const taskUUID = randomUUID()
    const response = await fetchWithTimeout('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify([{
        taskType: 'videoInference',
        taskUUID,
        model: this.model,
        positivePrompt: buildMotionPrompt(req),
        frameImages: [req.imageUrl],
        deliveryMethod: 'async',
        outputType: 'URL',
        outputFormat: 'MP4',
        // Draft clips override duration (short = cheap). Clamp to the same
        // 3–8s window as the configured default.
        duration: Math.min(8, Math.max(3, req.durationSeconds ?? this.duration)),
        aspectRatio: resolveAspectRatio(req),
        ttl: 604800,
        includeCost: true,
      }]),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Runware create generation failed: ${response.status} ${text}`)
    }

    const data = await response.json() as {
      data?: Array<{ taskUUID?: string; status?: string; videoURL?: string }>
      errors?: Array<{ message?: string }>
    }
    const errorMessage = data.errors?.[0]?.message
    if (errorMessage) throw new Error(`Runware rejected generation: ${errorMessage}`)

    const accepted = data.data?.[0]
    return {
      provider: 'runware',
      providerJobId: accepted?.taskUUID ?? taskUUID,
      status: accepted?.status === 'success'
        ? 'completed'
        : accepted?.status === 'error'
          ? 'failed'
          : 'pending',
      videoUrl: accepted?.videoURL ?? null,
      model: this.model,
    }
  }

  async poll(jobId: string): Promise<VideoGenerationResult> {
    if (!this.apiKey) throw new Error('Missing Runware API key')

    const response = await fetchWithTimeout('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify([{ taskType: 'getResponse', taskUUID: jobId }]),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Runware poll generation failed: ${response.status} ${text}`)
    }

    const data = await response.json() as {
      data?: Array<{ taskUUID?: string; status?: string; progress?: number; videoURL?: string }>
      errors?: Array<{ message?: string }>
    }
    const errorMessage = data.errors?.[0]?.message
    if (errorMessage) {
      return {
        provider: 'runware',
        providerJobId: jobId,
        status: 'failed',
        videoUrl: null,
        model: this.model,
        error: errorMessage,
      }
    }

    const result = data.data?.find((item) => item.taskUUID === jobId) ?? data.data?.[0]
    const status = result?.status === 'success'
      ? 'completed'
      : result?.status === 'error'
        ? 'failed'
        : 'pending'

    return {
      provider: 'runware',
      providerJobId: jobId,
      status,
      videoUrl: result?.videoURL ?? null,
      model: this.model,
    }
  }
}

function buildMotionPrompt(req: VideoGenerationRequest): string {
  const style = req.style ?? 'cinematic'

  // The still carries the look; the motion prompt supplies only motion.
  // Keep it to 5-12 words, ONE camera move. Do not re-describe the scene —
  // re-describing it makes the model redesign the image.
  const styleMotion: Record<VideoStyle, string> = {
    cinematic: 'slow push-in',
    loop: 'seamless ambient loop',
    subtle: 'subtle parallax drift',
    dynamic: 'slow dolly push',
  }

  const genreMotion: Record<string, string> = {
    horror: 'eerie atmosphere',
    mystery: 'noir mood',
    comedy: 'playful energy',
    adventure: 'forward cinematic dolly',
    'sci-fi': 'neon pulse',
    fantasy: 'ethereal glow',
  }

  const motion = styleMotion[style] ?? styleMotion.cinematic
  const mood = genreMotion[req.genre.toLowerCase()] ?? ''
  // One move + one mood + one instruction to hold the locked first frame.
  return `${motion}.${mood ? ` ${mood}.` : ''} Keep the first frame identical.`
}

/**
 * Luma Dream Machine I2V provider.
 * Docs: https://api.lumalabs.ai/dream-machine/v1
 */
export class LumaProvider implements VideoProvider {
  readonly name = 'luma' as const
  private readonly apiKey: string | undefined
  private readonly model: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey ?? process.env.LUMA_API_KEY
    this.model = model ?? process.env.LUMA_VIDEO_MODEL ?? 'ray-2'
  }

  async createJob(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) throw new Error('Missing Luma API key')

    const response = await fetchWithTimeout('https://api.lumalabs.ai/dream-machine/v1/generations', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        prompt: buildMotionPrompt(req),
        model: this.model,
        aspect_ratio: resolveAspectRatio(req),
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

    const response = await fetchWithTimeout(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
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
  readonly name = 'fal' as const
  private readonly apiKey: string | undefined
  private readonly model: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey ?? process.env.FAL_KEY ?? process.env.FAL_API_KEY
    this.model = model ?? process.env.FAL_VIDEO_MODEL ?? 'fal-ai/stable-video-diffusion'
  }

  async createJob(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) throw new Error('Missing Fal API key')

    const response = await fetchWithTimeout(`https://queue.fal.run/${this.model}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Key ${this.apiKey}`,
      },
      body: JSON.stringify({
        image_url: req.imageUrl,
        prompt: buildMotionPrompt(req),
        aspect_ratio: resolveAspectRatio(req),
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

    const response = await fetchWithTimeout(`https://queue.fal.run/${this.model}/requests/${jobId}/status`, {
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
  readonly name = 'replicate' as const
  private readonly apiKey: string | undefined
  private readonly model: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey ?? process.env.REPLICATE_API_TOKEN
    this.model = model ?? process.env.REPLICATE_VIDEO_MODEL ?? 'luma/ray-2'
  }

  async createJob(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) throw new Error('Missing Replicate API token')

    const response = await fetchWithTimeout('https://api.replicate.com/v1/predictions', {
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
          aspect_ratio: resolveAspectRatio(req),
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

    const response = await fetchWithTimeout(`https://api.replicate.com/v1/predictions/${jobId}`, {
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
  readonly name = 'mock' as const

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
    this.register(new RunwareProvider())
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

  getCandidates(): VideoProvider[] {
    const envProvider = process.env.VIDEO_PROVIDER as VideoProviderName | undefined
    const orderedNames: VideoProviderName[] = envProvider
      ? [envProvider, 'runware', 'luma', 'fal', 'replicate']
      : ['runware', 'luma', 'fal', 'replicate']

    const candidates = orderedNames
      .filter((name, index, names) => names.indexOf(name) === index)
      .map((name) => this.providers.get(name))
      .filter((provider): provider is VideoProvider => Boolean(provider))
      .filter((provider) => provider.name === 'runware'
        ? Boolean(process.env.RUNWARE_API_KEY)
        : provider.name === 'luma'
          ? Boolean(process.env.LUMA_API_KEY)
          : provider.name === 'fal'
            ? Boolean(process.env.FAL_KEY || process.env.FAL_API_KEY)
            : provider.name === 'replicate'
              ? Boolean(process.env.REPLICATE_API_TOKEN)
              : false)

    return candidates.length > 0 ? candidates : [this.providers.get('mock')!]
  }

  getDefault(): VideoProvider {
    return this.getCandidates()[0]
  }
}

export const videoProviderRegistry = new ProviderRegistry()

export class VideoGenerationService {
  static async generate(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const excluded = new Set(req.excludeProviders ?? [])
    let providers: VideoProvider[]

    if (req.providerOverride) {
      const requestedProvider = videoProviderRegistry.get(req.providerOverride)
      if (!requestedProvider) {
        // Explicit override that is not a known provider must fail — never
        // silently fall back to the provider list (or mock).
        return {
          provider: 'failed',
          providerJobId: null,
          status: 'failed',
          videoUrl: null,
          model: 'unknown',
          error: `Unknown video provider: ${req.providerOverride}`,
        }
      }
      providers = excluded.has(requestedProvider.name) ? [] : [requestedProvider]
    } else {
      providers = videoProviderRegistry.getCandidates().filter((provider) => !excluded.has(provider.name))
    }

    let lastError = 'Video generation failed'

    for (const provider of providers) {
      try {
        const result = await provider.createJob(req)
        if (result.status !== 'failed') return result
        lastError = result.error || lastError
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError
        console.warn(`[VideoGenerationService] ${provider.name} create failed; trying fallback`, lastError)
      }
    }

    console.error('[VideoGenerationService] All providers failed:', lastError)
    return {
      provider: 'failed',
      providerJobId: null,
      status: 'failed',
      videoUrl: null,
      model: 'unknown',
      error: lastError,
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
        retryable: isRetryablePollError(message),
      }
    }
  }
}


