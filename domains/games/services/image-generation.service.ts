/**
 * Image Generation Service with Multi-Provider Support
 * Primary: Venice AI
 * Fallback 1: Replicate (most reliable)
 * Fallback 2: Netmind AI (if configured)
 * 
 * Generates visual representations for games and narrative moments
 *
 * Architecture: Single source of truth for all image generation logic
 * - Game cover images: Called once at game creation
 * - Narrative images: Called per-turn to visualize story moments
 * - Caching: Prevents duplicate API calls for identical prompts
 * - Model experimentation: A/B tests different models for comic quality
 * - Server-side API: Uses /api/generate-image endpoint to keep API key secure
 * - Automatic failover: Falls back to Replicate/Netmind if Venice fails
 */

export type ImageProvider = 'venice' | 'replicate' | 'netmind' | 'modal' | 'failed'

export interface ImageGenerationResult {
  imageUrl: string | null
  model: string
  provider: ImageProvider
  timestamp: number
}

export class ImageGenerationService {
  private static getApiEndpoint(): string {
    // Handle both client and server-side calls
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/generate-image`
    }
    // Server-side: use Hetzner backend directly (persistent process, no cold starts)
    const backendUrl = process.env.API_BACKEND_URL || 'https://api.snel.famile.xyz/writersarcade'
    return `${backendUrl}/api/generate-image`
  }
  private static readonly CACHE = new Map<string, ImageGenerationResult>() // prompt → result with metadata
  
  // Venice AI models (primary provider)
  private static readonly VENICE_MODELS = [
    'venice-sd35',      // Default, works with all features ($0.01)
    'qwen-image',       // Highest quality ($0.01)
    'hidream',          // Fast generation ($0.01)
  ]
  
  // Netmind AI models (fallback provider - OpenAI compatible)
  // Note: Netmind service availability may vary. Test before relying on it.
  private static readonly NETMIND_MODELS = [
    'black-forest-labs/FLUX.1-schnell',  // Fast, high quality (~2s)
  ]
  
  // Replicate models (reliable fallback provider)
  private static readonly REPLICATE_MODELS = [
    'black-forest-labs/flux-schnell',           // Fast, high quality (~2s)
    'stability-ai/sdxl',                        // High quality
  ]
  
  // Track provider health for smart failover
  private static providerHealth = {
    venice: { failures: 0, lastSuccess: Date.now() },
    netmind: { failures: 0, lastSuccess: Date.now() },
  }
  
  // Track model performance over time
  private static readonly MODEL_RATINGS = new Map<string, { count: number; score: number }>()
  
  /**
   * Determine which provider to use based on health status
   * Priority: modal (free, self-hosted) -> netmind -> venice (tertiary, runs out of credits)
   */
  private static selectProvider(): 'modal' | 'netmind' | 'venice' {
    const modalUrl = process.env.MODAL_IMAGE_GEN_URL
    const netmindApiKey = process.env.NETMIND_API_KEY
    const veniceApiKey = process.env.VENICE_API_KEY
    
    // Prefer Modal (self-hosted, no API costs)
    if (modalUrl) {
      return 'modal'
    }
    
    // Secondary: Netmind
    if (netmindApiKey) {
      console.log('[Image] Using Netmind (Modal not configured)')
      return 'netmind'
    }
    
    // Tertiary: Venice (runs out of credits quickly)
    if (veniceApiKey) {
      console.log('[Image] Using Venice (tertiary - Modal and Netmind not configured)')
      return 'venice'
    }
    
    console.warn('[Image] No image provider configured')
    return 'modal' // Will fail gracefully, fallback chain will try others
  }
  
  private static getRandomModel(provider: 'venice' | 'netmind' | 'modal'): string {
    if (provider === 'modal') return 'stable-diffusion-v1-5'
    const models = provider === 'venice' ? this.VENICE_MODELS : this.NETMIND_MODELS
    
    // Weight selection by quality ratings if available
    const ratings = Array.from(this.MODEL_RATINGS.entries())
      .filter(([model]) => models.includes(model))
    
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
    
    // Fallback: uniform random from provider's models
    return models[Math.floor(Math.random() * models.length)]
  }
  
  /**
   * Call Venice AI image generation API
   */
  private static async callVeniceAPI(prompt: string, model: string): Promise<{ imageUrl: string | null; success: boolean }> {
    const veniceApiKey = process.env.VENICE_API_KEY
    if (!veniceApiKey) {
      return { imageUrl: null, success: false }
    }

    try {
      const veniceResponse = await fetch('https://api.venice.ai/api/v1/image/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${veniceApiKey}`,
        },
        body: JSON.stringify({
          prompt,
          model,
          width: 1280,
          height: 720,
          format: 'png',
        }),
      })

      if (!veniceResponse.ok) {
        const errorText = await veniceResponse.text()
        console.error('[Venice] API error:', veniceResponse.status, errorText)
        
        if (veniceResponse.status === 402) {
          console.warn('[Venice] Credits exhausted - will use fallback provider')
        }
        
        this.providerHealth.venice.failures++
        return { imageUrl: null, success: false }
      }

      const data = await veniceResponse.json()
      const imageUrl = data.images?.[0] ? `data:image/png;base64,${data.images[0]}` : null
      
      if (imageUrl) {
        this.providerHealth.venice.lastSuccess = Date.now()
        this.providerHealth.venice.failures = 0
      }
      
      return { imageUrl, success: true }
    } catch (error) {
      console.error('[Venice] Request failed:', error)
      this.providerHealth.venice.failures++
      return { imageUrl: null, success: false }
    }
  }
  
  /**
   * Call Netmind AI image generation API (OpenAI-compatible)
   */
  private static async callNetmindAPI(prompt: string, model: string): Promise<{ imageUrl: string | null; success: boolean }> {
    const netmindApiKey = process.env.NETMIND_API_KEY
    if (!netmindApiKey) {
      return { imageUrl: null, success: false }
    }

    try {
      const netmindResponse = await fetch('https://api.netmind.ai/inference-api/openai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${netmindApiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt,
          response_format: 'b64_json',
        }),
      })

      if (!netmindResponse.ok) {
        const errorText = await netmindResponse.text()
        console.error('[Netmind] API error:', netmindResponse.status, errorText)
        this.providerHealth.netmind.failures++
        return { imageUrl: null, success: false }
      }

      const data = await netmindResponse.json()
      const imageUrl = data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null
      
      if (imageUrl) {
        this.providerHealth.netmind.lastSuccess = Date.now()
        this.providerHealth.netmind.failures = 0
      }
      
      return { imageUrl, success: true }
    } catch (error) {
      console.error('[Netmind] Request failed:', error)
      this.providerHealth.netmind.failures++
      return { imageUrl: null, success: false }
    }
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
      
      const provider = this.selectProvider()
      const selectedModel = this.getRandomModel(provider)
      
      const response = await fetch(this.getApiEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          type: 'narrative',
          model: selectedModel,
          provider,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      const result: ImageGenerationResult = {
        imageUrl: data.imageUrl || null,
        model: selectedModel,
        provider: data.provider || provider,
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
        provider: 'failed',
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

    // If server-side, delegate to the API route which handles the full fallback chain
    // (modal -> netmind -> venice). This avoids duplicating fallback logic.
    if (typeof window === 'undefined') {
      const provider = this.selectProvider()
      const selectedModel = this.getRandomModel(provider)
      
      console.log(`[Image] Attempting ${provider} with model ${selectedModel}`)
      
      try {
        const response = await fetch(this.getApiEndpoint(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            type: 'narrative',
            model: selectedModel,
            provider,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const imageResult: ImageGenerationResult = {
            imageUrl: data.imageUrl || null,
            model: data.model || selectedModel,
            provider: data.provider || provider,
            timestamp: Date.now(),
          }
          if (imageResult.imageUrl) {
            this.CACHE.set(prompt, imageResult)
          }
          return imageResult
        }
      } catch (error) {
        console.error('[Image] Server-side fetch failed:', error)
      }

      return {
        imageUrl: null,
        model: selectedModel,
        provider: 'failed',
        timestamp: Date.now(),
      }
    }

    // Client-side: use local API endpoint
    const provider = this.selectProvider()
    const selectedModel = this.getRandomModel(provider)
    
    try {
      const response = await fetch(this.getApiEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          provider,
          type: 'narrative',
        }),
      })

      if (!response.ok) {
        console.error('Image generation API error:', response.status)
        return {
          imageUrl: null,
          model: selectedModel,
          provider: 'failed',
          timestamp: Date.now(),
        }
      }

      const data = await response.json()
      
      const result: ImageGenerationResult = {
        imageUrl: data.imageUrl || null,
        model: data.model || selectedModel,
        provider: data.provider || provider,
        timestamp: Date.now(),
      }

      if (result.imageUrl) {
        this.CACHE.set(prompt, result)
      }

      return result
    } catch (error) {
      console.error('Image generation failed:', error)
      return {
        imageUrl: null,
        model: selectedModel,
        provider: 'failed',
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
