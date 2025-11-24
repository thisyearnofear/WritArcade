import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { generateObject, streamText } from 'ai'
import { z } from 'zod'
import type { 
  GameGenerationRequest, 
  GameGenerationResponse, 
  GameplayResponse 
} from '../types'

// Consolidate AI model providers
const getModel = (modelName: string) => {
  if (modelName.startsWith('gpt')) {
    return openai(modelName)
  } else if (modelName.startsWith('claude')) {
    return anthropic(modelName)
  }
  return openai('gpt-4o-mini') // fallback
}

// Game generation schema for structured output
const gameGenerationSchema = z.object({
  title: z.string(),
  description: z.string(),
  tagline: z.string(),
  genre: z.string(),
  subgenre: z.string(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
})

/**
 * Consolidated Game AI Service
 * Merges GenerateGame.js, StartGame.js, and ChatGame.js functionality
 */
export class GameAIService {
  
  /**
   * Generate a new game from prompt text or URL content
   * Enhanced version of original GenerateGame.js
   */
  static async generateGame(request: GameGenerationRequest): Promise<GameGenerationResponse> {
    const model = getModel(request.model || 'gpt-4o-mini')
    
    let promptText = request.promptText || ''
    
    // If URL provided, we'll handle content extraction separately
    if (request.url && !promptText) {
      promptText = `Generate a game based on content from: ${request.url}`
    }
    
    const prompt = this.buildGenerationPrompt(promptText)
    
    try {
      const { object: game } = await generateObject({
        model,
        schema: gameGenerationSchema,
        prompt,
      })
      
      return {
        ...game,
        promptModel: request.model || 'gpt-4o-mini',
        promptName: request.promptName || 'GenerateGame-v2',
        promptText: request.promptText,
      }
    } catch (error) {
      console.error('Game generation error:', error)
      throw new Error('Failed to generate game')
    }
  }
  
  /**
   * Start a new game session with initial narrative
   * Enhanced version of original StartGame.js
   */
  static async* startGame(
    game: { title: string; description: string; genre: string; subgenre: string; tagline: string },
    sessionId: string,
    model: string = 'gpt-4o-mini'
  ): AsyncGenerator<GameplayResponse> {
    
    const aiModel = getModel(model)
    const prompt = this.buildStartGamePrompt(game)
    
    try {
      const { textStream } = await streamText({
        model: aiModel,
        prompt,
      })
      
      let content = ''
      
      for await (const delta of textStream) {
        content += delta
        yield {
          type: 'content',
          content: delta,
        }
      }
      
      // Parse options from the final content
      const options = this.parseGameOptions(content)
      
      yield {
        type: 'options',
        options,
      }
      
      yield {
        type: 'end',
      }
      
    } catch (error) {
      console.error('Game start error:', error)
      throw new Error('Failed to start game')
    }
  }
  
  /**
   * Continue game conversation with user input
   * Enhanced version of original ChatGame.js
   */
  static async* chatGame(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    userInput: string,
    model: string = 'gpt-4o-mini'
  ): AsyncGenerator<GameplayResponse> {
    
    const aiModel = getModel(model)
    
    // Add user input to conversation
    const conversationMessages = [
      ...messages,
      { role: 'user' as const, content: userInput }
    ]
    
    try {
      const { textStream } = await streamText({
        model: aiModel,
        messages: conversationMessages,
      })
      
      let content = ''
      
      for await (const delta of textStream) {
        content += delta
        yield {
          type: 'content',
          content: delta,
        }
      }
      
      // Parse options from response
      const options = this.parseGameOptions(content)
      
      if (options.length > 0) {
        yield {
          type: 'options',
          options,
        }
      }
      
      yield {
        type: 'end',
      }
      
    } catch (error) {
      console.error('Game chat error:', error)
      throw new Error('Failed to process game input')
    }
  }
  
  /**
   * Build generation prompt (enhanced from original)
   */
  private static buildGenerationPrompt(promptText: string): string {
    return `I am GameCreator-GPT, an AI specializing in generating creative and engaging game ideas. Generate a unique interactive text-based game idea that avoids common tropes like escape rooms and island games. The game should be exciting, dramatic, and fun.

Please provide a JSON response with the following structure:
- title: An engaging game title
- genre: Main genre (e.g., "Mystery", "Adventure", "Sci-Fi")  
- subgenre: More specific genre (e.g., "Detective Thriller", "Space Opera")
- description: Detailed game description that matches the genre
- tagline: A funny, witty, and edgy tagline the main character would say
- primaryColor: A hex color with high contrast against #000000

${promptText ? `The user has specifically requested a game about: ${promptText}` : ''}`
  }
  
  /**
   * Build start game prompt (enhanced from original)
   */
  private static buildStartGamePrompt(game: any): string {
    return `You are an interactive text game engine.

# GAME DETAILS
Title: ${game.title}
Genre: ${game.genre}
Subgenre: ${game.subgenre}
Description: ${game.description}
Tagline: ${game.tagline}

# RULES
* Stay in character and maintain the game's tone
* Keep responses relatively short for tight feedback loops
* Always end with exactly 4 numbered options (1. 2. 3. 4.)
* Be concise, witty, and engaging
* Ensure the story aligns with the game description
* Make choices meaningful with real consequences
* Begin each option with the number, period, and space (e.g., "1. ")

Start the game now. Set the scene and present 4 initial choices.`
  }
  
  /**
   * Parse numbered options from AI response
   * Enhanced version of original parseTokenStream.js logic
   */
  private static parseGameOptions(content: string): Array<{ id: number; text: string }> {
    const options: Array<{ id: number; text: string }> = []
    const lines = content.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      const match = trimmed.match(/^(\d+)\.\s+(.+)$/)
      
      if (match && match[2]) {
        const id = parseInt(match[1])
        const text = match[2]
        
        if (id >= 1 && id <= 4) {
          options.push({ id, text })
        }
      }
    }
    
    return options.sort((a, b) => a.id - b.id)
  }
}