/**
 * Image Generation Service using Venice AI
 * Generates visual representations for games and narrative moments
 *
 * Architecture: Single source of truth for all image generation logic
 * - Game cover images: Called once at game creation
 * - Narrative images: Called per-turn to visualize story moments
 * - Caching: Prevents duplicate API calls for identical prompts
 * - Server-side API: Uses /api/generate-image endpoint to keep API key secure
 */
export class ImageGenerationService {
  private static readonly API_ENDPOINT = '/api/generate-image'
  private static readonly CACHE = new Map<string, string>() // prompt → base64 image

  /**
   * Generate an image for a game based on its metadata (cover art)
   */
  static async generateGameImage(game: {
    title: string
    description: string
    genre: string
    subgenre: string
    tagline: string
  }): Promise<string | null> {
    const prompt = this.buildGameCoverPrompt(game)
    return this.fetchImage(prompt)
  }

  /**
   * Generate an image for a narrative moment (per-turn)
   * Called during gameplay to visualize the current story beat
   */
  static async generateNarrativeImage(context: {
    narrative: string        // The AI-generated narrative text
    genre: string            // Game genre for style consistency
    primaryColor?: string    // Game's primary color for palette matching
  }): Promise<string | null> {
    const prompt = this.buildNarrativePrompt(context)
    return this.fetchImage(prompt)
  }

  /**
   * Core image generation fetch logic (shared by all generation types)
   * Calls server-side API endpoint which handles Venice API key securely
   * Implements caching to prevent duplicate API calls
   */
  private static async fetchImage(prompt: string): Promise<string | null> {
    // Check cache first
    if (this.CACHE.has(prompt)) {
      console.log('Image cache hit for prompt')
      return this.CACHE.get(prompt) || null
    }

    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          type: 'narrative', // or 'game' - for future flexibility
        }),
      })

      if (!response.ok) {
        console.error('Image generation API error:', response.status)
        return null
      }

      const data = await response.json()

      if (data.imageUrl) {
        // Cache for future identical prompts
        this.CACHE.set(prompt, data.imageUrl)
        return data.imageUrl
      }

      return null
    } catch (error) {
      console.error('Image generation failed:', error)
      return null
    }
  }

  /**
   * Build prompt for game cover art (called once)
   */
  private static buildGameCoverPrompt(game: {
    title: string
    description: string
    genre: string
    subgenre: string
  }): string {
    const genreStyles: Record<string, string> = {
      horror: 'dark, ominous, atmospheric, moody lighting, shadows',
      mystery: 'noir, dramatic lighting, mysterious atmosphere, intrigue',
      comedy: 'bright, colorful, whimsical, playful, vibrant',
      adventure: 'epic, cinematic, grand scale, dramatic',
      'sci-fi': 'futuristic, technological, neon, cyberpunk aesthetic',
      fantasy: 'magical, ethereal, mystical, enchanted',
    }

    const style = genreStyles[game.genre.toLowerCase()] || 'cinematic, dramatic'

    return `A ${style} scene representing "${game.title}". ${game.description.substring(0, 200)}. High quality digital art, game cover art style, professional illustration.`
  }

  /**
   * Build prompt for narrative moment (called per-turn)
   * Extracts key details from narrative to create contextual images
   */
  private static buildNarrativePrompt(context: {
    narrative: string
    genre: string
    primaryColor?: string
  }): string {
    const genreStyles: Record<string, string> = {
      horror: 'dark, ominous, atmospheric, moody lighting, high contrast shadows',
      mystery: 'noir, dramatic lighting, suspicious atmosphere, shadowy',
      comedy: 'bright, vibrant, playful, colorful, humorous visual style',
      adventure: 'cinematic, epic, grand scale, dramatic action, dynamic lighting',
      'sci-fi': 'futuristic, technological, neon accents, sleek, otherworldly',
      fantasy: 'magical, ethereal, mystical, glowing effects, enchanted atmosphere',
    }

    const style = genreStyles[context.genre.toLowerCase()] || 'cinematic, dramatic'

    // Extract key narrative elements (first 500 chars to keep prompt focused)
    const narrativeExcerpt = context.narrative.substring(0, 500)

    // Build color instruction if primaryColor provided
    const colorInstruction = context.primaryColor 
      ? `, with ${context.primaryColor} color accents`
      : ''

    return `A ${style} illustration depicting the following scene${colorInstruction}: "${narrativeExcerpt}". High quality digital art, game scene illustration style, professional artwork, immersive and detailed.`
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  static clearCache(): void {
    this.CACHE.clear()
  }

  /**
   * Get cache stats (for debugging/monitoring)
   */
  static getCacheStats(): { size: number } {
    return { size: this.CACHE.size }
  }
}
