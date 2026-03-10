/**
 * Image Generation Service using Venice AI
 * Generates visual representations for games and narrative moments
 *
 * Architecture: Single source of truth for all image generation logic
 * - Game cover images: Called once at game creation
 * - Narrative images: Called per-turn to visualize story moments
 * - Caching: Prevents duplicate API calls for identical prompts
 * - Model experimentation: A/B tests different Venice models for comic quality
 * - Server-side API: Uses /api/generate-image endpoint to keep API key secure
 */

export interface ImageGenerationResult {
  imageUrl: string | null
  model: string
  timestamp: number
}

export class ImageGenerationService {
  private static getApiEndpoint(): string {
    // Handle both client and server-side calls
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/generate-image`
    }
    // Server-side: use absolute URL for fetch
    // Next.js uses 3000 by default, but respects PORT env var at startup
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = process.env.VERCEL_URL || 'localhost:3000'
    return `${protocol}://${host}/api/generate-image`
  }
  private static readonly CACHE = new Map<string, ImageGenerationResult>() // prompt → result with metadata
  
  // Venice AI models to test (excluding nano-banana-pro for cost)
  private static readonly MODELS = [
    'venice-sd35',      // Default, works with all features ($0.01)
    'qwen-image',       // Highest quality ($0.01)
    'hidream',          // Fast generation ($0.01)
  ]
  
  // Track model performance over time
  private static readonly MODEL_RATINGS = new Map<string, { count: number; score: number }>()
  
  private static getRandomModel(): string {
    // Weight selection by quality ratings if available
    const ratings = Array.from(this.MODEL_RATINGS.entries())
    if (ratings.length > 0) {
      // Weighted random selection - higher rated models chosen more often
      const totalScore = ratings.reduce((sum, [_, { score }]) => sum + score, 0)
      const weights = ratings.map(([model, { score }]) => ({ 
        model, 
        weight: (score || 1) / totalScore 
      }))
      
      let random = Math.random()
      for (const { model, weight } of weights) {
        random -= weight
        if (random <= 0) return model
      }
    }
    
    // Fallback: uniform random from all models
    return this.MODELS[Math.floor(Math.random() * this.MODELS.length)]
  }

  /**
   * Generate image for game panels (multi-panel support)
   */
  static async generateImage(params: {
    prompt: string
    genre: string
    style?: string
    aspectRatio?: string
    force?: boolean  // Force regeneration, bypass cache
  }): Promise<ImageGenerationResult> {
    const cacheKey = `${params.prompt}_${params.genre}_${params.style || 'comic'}`
    
    // Check cache first (unless force=true for regeneration)
    if (!params.force && this.CACHE.has(cacheKey)) {
      console.log('Image cache hit for:', cacheKey.substring(0, 50) + '...')
      return this.CACHE.get(cacheKey)!
    }

    try {
      const enhancedPrompt = this.buildNarrativePrompt({
        narrative: params.prompt,
        genre: params.genre
      })
      const selectedModel = this.getRandomModel()
      
      const response = await fetch(this.getApiEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          type: 'narrative',
          model: selectedModel,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      const result: ImageGenerationResult = {
        imageUrl: data.imageUrl || null,
        model: selectedModel,
        timestamp: Date.now(),
      }

      // Cache the result
      this.CACHE.set(cacheKey, result)
      
      return result
    } catch (error) {
      console.error('Image generation failed:', error)
      return {
        imageUrl: null,
        model: 'failed',
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Generate an image for a game based on its metadata (cover art)
   */
  static async generateGameImage(game: {
    title: string
    description: string
    genre: string
    subgenre: string
    tagline: string
  }): Promise<ImageGenerationResult> {
    const prompt = this.buildGameCoverPrompt(game)
    return this.fetchImage(prompt)
  }

  /**
   * Generate an image for a narrative moment (per-turn)
   * Called during gameplay to visualize the current story beat
   * Returns both image and model used for A/B testing
   */
  static async generateNarrativeImage(context: {
    narrative: string        // The AI-generated narrative text
    genre: string            // Game genre for style consistency
    primaryColor?: string    // Game's primary color for palette matching
  }): Promise<ImageGenerationResult> {
    // Use the new generateImage method for consistency
    return this.generateImage({
      prompt: context.narrative,
      genre: context.genre,
      style: 'comic_book',
      aspectRatio: 'landscape'
    })
  }

  /**
   * Record user feedback on image quality for model optimization
   */
  static recordModelFeedback(model: string, rating: number): void {
    const current = this.MODEL_RATINGS.get(model) || { count: 0, score: 0 }
    current.count += 1
    current.score = (current.score + rating) / current.count // Running average
    this.MODEL_RATINGS.set(model, current)
    console.log(`Model ${model} rating: ${current.score.toFixed(2)} (${current.count} ratings)`)
  }

  /**
   * Get current model performance stats
   */
  static getModelStats(): Record<string, { count: number; score: number }> {
    const stats: Record<string, { count: number; score: number }> = {}
    for (const [model, data] of this.MODEL_RATINGS.entries()) {
      stats[model] = data
    }
    return stats
  }

  /**
   * Core image generation fetch logic (shared by all generation types)
   * Calls Venice API directly if server-side, or through API endpoint if client-side
   * Implements caching to prevent duplicate API calls
   * Tracks model performance for A/B testing
   */
  private static async fetchImage(
    prompt: string
  ): Promise<ImageGenerationResult> {
    // Check cache first
    if (this.CACHE.has(prompt)) {
      console.log('Image cache hit for prompt')
      return this.CACHE.get(prompt)!
    }

    const selectedModel = this.getRandomModel()

    try {
      let data

      // If server-side, call Venice API directly (avoid HTTP round-trip to own endpoint)
      if (typeof window === 'undefined') {
        const veniceApiKey = process.env.VENICE_API_KEY
        if (!veniceApiKey) {
          console.warn('Venice API key not configured')
          return {
            imageUrl: null,
            model: selectedModel,
            timestamp: Date.now(),
          }
        }

        const veniceResponse = await fetch('https://api.venice.ai/api/v1/image/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${veniceApiKey}`,
          },
          body: JSON.stringify({
            prompt,
            model: selectedModel,
            width: 1280,    // Landscape for comic panels (Venice max)
            height: 720,    // 16:9 aspect ratio
            format: 'png',
          }),
        })

        if (!veniceResponse.ok) {
          const errorText = await veniceResponse.text()
          console.error('Venice API error:', veniceResponse.status, errorText)
          return {
            imageUrl: null,
            model: selectedModel,
            timestamp: Date.now(),
          }
        }

        data = await veniceResponse.json()
      } else {
        // Client-side: use local API endpoint
        const response = await fetch(this.getApiEndpoint(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            model: selectedModel,
            type: 'narrative',
          }),
        })

        if (!response.ok) {
          console.error('Image generation API error:', response.status)
          return {
            imageUrl: null,
            model: selectedModel,
            timestamp: Date.now(),
          }
        }

        data = await response.json()
      }

      const result: ImageGenerationResult = {
        imageUrl: data.images?.[0] ? `data:image/png;base64,${data.images[0]}` : (data.imageUrl || null),
        model: selectedModel,
        timestamp: Date.now(),
      }

      if (result.imageUrl) {
        // Cache for future identical prompts
        this.CACHE.set(prompt, result)
      }

      return result
    } catch (error) {
      console.error('Image generation failed:', error)
      return {
        imageUrl: null,
        model: selectedModel,
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Build prompt for game cover art (called once)
   * Comic-style artwork for game cards and NFT displays
   */
  private static buildGameCoverPrompt(game: {
    title: string
    description: string
    genre: string
    subgenre: string
  }): string {
    const genreComicStyles: Record<string, string> = {
      horror: 'dark comic book cover art, bold inking, moody lighting, ominous atmosphere, graphic novel style',
      mystery: 'noir comic cover, dramatic lighting, mysterious and intrigue, detective aesthetic, comic style',
      comedy: 'bright cartoon comic cover, colorful, whimsical, playful illustration, comic style',
      adventure: 'epic comic cover, grand scale, dramatic action, dynamic composition, comic book style',
      'sci-fi': 'futuristic comic cover, technological aesthetic, neon accents, cyberpunk illustration, sci-fi comic style',
      fantasy: 'magical comic cover, mystical illustration, enchanted atmosphere, fantasy comic style',
    }

    const style = genreComicStyles[game.genre.toLowerCase()] || 'comic panel illustration, bold lines'

    return `${style} for a game titled "${game.title}". ${game.description.substring(0, 200)}. High quality comic book illustration, professional artwork, expressive and detailed. NOT photorealistic.`
  }

  /**
    * Build prompt for narrative moment (called per-turn)
    * Extracts key details from narrative to create contextual COMIC PANELS
    * Emphasizes comic/illustration aesthetic over photorealism
    * 
    * Strategy: Extract FIRST coherent scene/paragraph (2-3 sentences) for focused image generation
    */
  private static buildNarrativePrompt(context: {
    narrative: string
    genre: string
    primaryColor?: string
  }): string {
    const genreComicStyles: Record<string, string> = {
      horror: 'dark comic book panel, bold inking, high contrast shadows, moody lighting, ominous atmosphere, graphic novel style',
      mystery: 'noir comic panel, dramatic shadows, suspicious atmosphere, comic book illustration, bold lines, high contrast',
      comedy: 'bright cartoon comic panel, exaggerated expressions, vibrant colors, playful illustration, comic style, humorous',
      adventure: 'action comic panel, dynamic poses, motion lines, epic scale, dramatic composition, comic book illustration',
      'sci-fi': 'futuristic comic panel, tech aesthetic, neon accents, science fiction illustration, bold comic style, otherworldly',
      fantasy: 'magical comic panel, mystical illustration, glowing effects, enchanted atmosphere, fantasy comic style, detailed',
    }

    const style = genreComicStyles[context.genre.toLowerCase()] || 'comic panel illustration, bold lines, digital art style'

    // Extract FIRST coherent scene: take sentences until we have 2-3 sentences or reach ~300 chars
    // This prevents mixing multiple scenes into one image prompt
    const extractFirstScene = (text: string): string => {
      const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
      let scene = ''
      let sentenceCount = 0
      
      // Take first 2-3 sentences
      for (const sentence of sentences) {
        if (sentenceCount >= 3) break
        if (scene.length > 300 && sentenceCount >= 2) break
        
        scene += (scene ? ' ' : '') + sentence
        sentenceCount++
      }
      
      return scene.trim()
    }

    const narrativeExcerpt = extractFirstScene(context.narrative)

    // Build color instruction if primaryColor provided
    const colorInstruction = context.primaryColor 
      ? `, featuring ${context.primaryColor} color palette and accents`
      : ''

    const prompt = `${style} depicting this scene${colorInstruction}: "${narrativeExcerpt}". Comic book illustration, professional artwork, high quality digital art, expressive and dynamic. NOT photorealistic. Comic/illustrated aesthetic.`
    
    // Log for debugging - shows what prompt was sent to image generator
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Image Generation] Narrative excerpt: ${narrativeExcerpt.substring(0, 80)}...`)
    }
    
    return prompt
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
  static getCacheStats(): { size: number; models: Record<string, { count: number; score: number }> } {
    return { 
      size: this.CACHE.size,
      models: this.getModelStats(),
    }
  }
}
