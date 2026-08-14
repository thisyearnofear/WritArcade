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
  /**
   * Native output ratio. Video must be composited at its native ratio — never
   * crop a wide clip for Stories (the object gets cut). Defaults to vertical
   * 9:16 for the social hero clip. See docs/VIDEO_ARTIFACT_PIPELINE.md.
   */
  aspectRatio?: VideoAspectRatio
  /** Per-request duration override (seconds). Draft/preview clips use a short
   *  3s window so motion can be validated cheaply before the final commit. */
  durationSeconds?: number
}

export type VideoStyle = 'cinematic' | 'loop' | 'subtle' | 'dynamic'

export const VIDEO_STYLE_LABELS: Record<VideoStyle, string> = {
  cinematic: 'Cinematic',
  loop: 'Seamless Loop',
  subtle: 'Subtle Motion',
  dynamic: 'Dynamic Action',
}

export type VideoAspectRatio = '16:9' | '9:16' | '1:1'

export const VIDEO_ASPECT_RATIO_LABELS: Record<VideoAspectRatio, string> = {
  '16:9': 'Landscape (X / web)',
  '9:16': 'Vertical (Stories / social)',
  '1:1': 'Square (feed)',
}
