/**
 * Image Generation Service using Venice AI
 * Generates visual representations for games
 */
export class ImageGenerationService {
  private static readonly VENICE_API_URL = 'https://api.venice.ai/api/v1/images/generations'
  
  /**
   * Generate an image for a game based on its metadata
   */
  static async generateGameImage(game: {
    title: string
    description: string
    genre: string
    subgenre: string
    tagline: string
  }): Promise<string | null> {
    const apiKey = process.env.VENICE_API_KEY
    
    if (!apiKey) {
      console.warn('Venice API key not configured, skipping image generation')
      return null
    }

    try {
      const prompt = this.buildImagePrompt(game)
      
      const response = await fetch(this.VENICE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          model: 'fluently-xl',
          width: 1024,
          height: 768,
          num_images: 1,
        }),
      })

      if (!response.ok) {
        console.error('Venice API error:', response.status, response.statusText)
        return null
      }

      const data = await response.json()
      
      // Venice returns base64 encoded images
      if (data.data && data.data[0] && data.data[0].b64_json) {
        return `data:image/png;base64,${data.data[0].b64_json}`
      }

      return null
    } catch (error) {
      console.error('Image generation failed:', error)
      return null
    }
  }

  /**
   * Build an effective image prompt from game metadata
   */
  private static buildImagePrompt(game: {
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
}
