/**
 * Voice Narration Service using ElevenLabs TTS
 * Generates audio narration for comic panel narratives
 *
 * Architecture: Single source of truth for all voice narration logic
 * - Panel narration: Called per-panel to generate audio for narrative text
 * - Caching: Prevents duplicate API calls for identical narratives
 * - Server-side API: Uses /api/generate-audio endpoint to keep API keys secure
 *
 * Core Principles:
 * - ENHANCEMENT FIRST: Follows existing ImageGenerationService patterns
 * - DRY: Reuses caching and API patterns from image generation
 * - MODULAR: Clean interface for voice generation
 */

export interface VoiceNarrationResult {
  audioUrl: string | null
  durationMs: number | null
  voice: string
  timestamp: number
}

export interface VoiceNarrationOptions {
  voice?: string
  force?: boolean
}

const GENRE_VOICE_MAP: Record<string, string> = {
  horror: 'Rachel',
  mystery: 'Rachel',
  comedy: 'Rachel',
  adventure: 'Rachel',
  'sci-fi': 'Rachel',
  fantasy: 'Rachel',
  default: 'Rachel',
}

export class VoiceNarrationService {
  private static getApiEndpoint(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/generate-audio`
    }

    const backendUrl = process.env.API_BACKEND_URL
    if (backendUrl) {
      return `${backendUrl}/api/generate-audio`
    }

    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = process.env.VERCEL_URL || 'localhost:3000'
    return `${protocol}://${host}/api/generate-audio`
  }

  private static readonly CACHE = new Map<string, VoiceNarrationResult>()

  static getVoiceForGenre(genre: string): string {
    return GENRE_VOICE_MAP[genre.toLowerCase()] || GENRE_VOICE_MAP.default
  }

  static async generateNarration(
    narrativeText: string,
    genre: string,
    options: VoiceNarrationOptions = {}
  ): Promise<VoiceNarrationResult> {
    const { voice = this.getVoiceForGenre(genre), force = false } = options
    const cacheKey = this.hashNarrative(narrativeText, voice)

    if (!force && this.CACHE.has(cacheKey)) {
      console.log('[VoiceNarration] Cache hit for:', narrativeText.substring(0, 40) + '...')
      return this.CACHE.get(cacheKey)!
    }

    try {
      const response = await fetch(this.getApiEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: narrativeText, voice }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[VoiceNarration] API error:', response.status, errorText)
        return this.createFailedResult(voice)
      }

      const data = await response.json()
      const result: VoiceNarrationResult = {
        audioUrl: data.audioUrl || null,
        durationMs: data.durationMs || null,
        voice,
        timestamp: Date.now(),
      }

      if (result.audioUrl) {
        this.CACHE.set(cacheKey, result)
      }

      return result
    } catch (error) {
      console.error('[VoiceNarration] Generation failed:', error)
      return this.createFailedResult(voice)
    }
  }

  static async generateBatchNarration(
    panels: Array<{ narrativeText: string; id: string }>,
    genre: string,
    options: VoiceNarrationOptions = {}
  ): Promise<Map<string, VoiceNarrationResult>> {
    const results = new Map<string, VoiceNarrationResult>()

    for (const panel of panels) {
      const result = await this.generateNarration(panel.narrativeText, genre, options)
      results.set(panel.id, result)
    }

    return results
  }

  private static createFailedResult(voice: string): VoiceNarrationResult {
    return {
      audioUrl: null,
      durationMs: null,
      voice,
      timestamp: Date.now(),
    }
  }

  private static hashNarrative(text: string, voice: string): string {
    const input = `${text}_${voice}`
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return `voice_${hash}`
  }

  static clearCache(): void {
    this.CACHE.clear()
  }

  static getCacheStats(): { size: number } {
    return { size: this.CACHE.size }
  }

  static isNarrationCached(narrativeText: string, genre: string): boolean {
    const voice = this.getVoiceForGenre(genre)
    const cacheKey = this.hashNarrative(narrativeText, voice)
    return this.CACHE.has(cacheKey)
  }
}
