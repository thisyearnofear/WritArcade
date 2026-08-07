export type VideoProviderName = 'runware' | 'luma' | 'fal' | 'replicate' | 'mock' | 'failed'

export type VideoGenerationStatus = 'idle' | 'pending' | 'completed' | 'failed'

export interface VideoGenerationResult {
  provider: VideoProviderName
  providerJobId: string | null
  status: VideoGenerationStatus
  videoUrl: string | null
  model: string
  error?: string
  /** True when polling failed transiently and the provider job may still be active. */
  retryable?: boolean
}

export interface VideoGenerationRequest {
  imageUrl: string
  narrative: string
  genre: string
  panelIndex: number
  primaryColor?: string
  providerOverride?: VideoProviderName
  excludeProviders?: VideoProviderName[]
  style?: VideoStyle
}

export type VideoStyle = 'cinematic' | 'loop' | 'subtle' | 'dynamic'

export const VIDEO_STYLE_LABELS: Record<VideoStyle, string> = {
  cinematic: 'Cinematic',
  loop: 'Seamless Loop',
  subtle: 'Subtle Motion',
  dynamic: 'Dynamic Action',
}
