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
   * 
   * Supports optional customization (genre, difficulty) for mini-app experience
   * Includes validation and retry logic for customization constraints
   */
  static async generateGame(request: GameGenerationRequest, retryCount = 0): Promise<GameGenerationResponse> {
    const model = getModel(request.model || 'gpt-4o-mini')
    const maxRetries = 2

    let promptText = request.promptText || ''

    // If URL provided, we'll handle content extraction separately
    if (request.url && !promptText) {
      promptText = `Generate a game based on content from: ${request.url}`
    }

    const prompt = this.buildGenerationPrompt(promptText, request.customization)

    try {
      const { object: game } = await generateObject({
        model,
        schema: gameGenerationSchema,
        prompt,
      })

      // Validate customization constraints
      if (request.customization?.genre) {
        const generatedGenre = game.genre.toLowerCase()
        const requestedGenre = request.customization.genre.toLowerCase()

        // Check if generated genre roughly matches requested genre
        if (!generatedGenre.includes(requestedGenre) && !requestedGenre.includes(generatedGenre)) {
          console.warn(
            `Genre mismatch: requested "${requestedGenre}", got "${generatedGenre}". Retrying with stricter prompt.`
          )

          if (retryCount < maxRetries) {
            // Retry with stricter genre constraint
            const stricterRequest = {
              ...request,
              promptText: `CRITICAL: The game MUST be in the "${request.customization.genre}" genre. This is not negotiable.\n\n${promptText}`,
            }
            return this.generateGame(stricterRequest, retryCount + 1)
          }
        }
      }

      return {
        title: game.title,
        description: game.description,
        tagline: game.tagline,
        genre: game.genre,
        subgenre: game.subgenre,
        primaryColor: game.primaryColor,
        promptModel: request.model || 'gpt-4o-mini',
        promptName: request.promptName || `GenerateGame-v2${retryCount > 0 ? `-retry${retryCount}` : ''}`,
        promptText: request.promptText,
      }
    } catch (error) {
      console.error('Game generation error:', error)

      // If this is a validation/schema error and we have retries left, retry
      if (retryCount < maxRetries && error instanceof Error && error.message.includes('schema')) {
        console.warn(`Schema validation failed. Retrying (${retryCount + 1}/${maxRetries})`)

        // Add stricter instructions
        const stricterRequest = {
          ...request,
          promptText: `You MUST provide ONLY valid JSON with these exact fields: title, description, tagline, genre, subgenre, primaryColor. No additional text.\n\n${promptText}`,
        }
        return this.generateGame(stricterRequest, retryCount + 1)
      }

      throw new Error(
        retryCount > 0
          ? `Failed to generate game after ${retryCount + 1} attempts`
          : 'Failed to generate game'
      )
    }
  }

  /**
   * Start a new game session with initial narrative
   * Enhanced version of original StartGame.js
   * 
   * Now supports optional article context for richer narrative continuity
   */
  static async* startGame(
    game: { title: string; description: string; genre: string; subgenre: string; tagline: string },
    sessionId: string,
    model: string = 'gpt-4o-mini',
    articleContext?: string
  ): AsyncGenerator<GameplayResponse> {

    const aiModel = getModel(model)
    const prompt = this.buildStartGamePrompt(game, articleContext)

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
   * 
   * Optionally constrains genre/difficulty if provided
   */
  private static buildGenerationPrompt(
    promptText: string,
    customization?: { genre?: string; difficulty?: string }
  ): string {
    let basePrompt = `I am GameCreator-GPT, an AI specializing in generating creative and engaging game ideas.`

    // Add strict customization constraints FIRST if provided
    if (customization?.genre) {
      basePrompt += `\n\nCRITICAL REQUIREMENT: This game MUST be in the "${customization.genre}" genre. The genre field in your response MUST contain "${customization.genre}". This is non-negotiable and will be validated.`
    }

    if (customization?.difficulty) {
      const difficultyGuide =
        customization.difficulty === 'easy'
          ? 'The game MUST be easy with straightforward choices, clear consequences, and simple mechanics. Avoid complex puzzles or hidden mechanics.'
          : 'The game MUST be challenging with complex choices, hidden mechanics, difficult decisions, and consequences that are not immediately obvious.'
      basePrompt += `\n\nDifficulty Requirement: ${difficultyGuide}`
    }

    basePrompt += `\n\nGenerate a unique interactive text-based game idea that avoids common tropes like escape rooms and island games. The game should be exciting, dramatic, and fun.

Please provide a JSON response with the following structure:
- title: An engaging game title
- genre: Main genre (e.g., "Mystery", "Adventure", "Sci-Fi")${customization?.genre ? ` - MUST include "${customization.genre}"` : ''}
- subgenre: More specific genre (e.g., "Detective Thriller", "Space Opera")
- description: Detailed game description that matches the genre${customization?.difficulty ? ` and ${customization.difficulty} difficulty` : ''}
- tagline: A funny, witty, and edgy tagline the main character would say
- primaryColor: A hex color with high contrast against #000000`

    if (promptText) {
      basePrompt += `\n\nThe user has specifically requested a game about: ${promptText}`
    }

    return basePrompt
  }

  /**
   * Build start game prompt (enhanced from original)
   * Now optionally includes article context for narrative continuity
   */
  private static buildStartGamePrompt(game: any, articleContext?: string): string {
    const basePrompt = `You are an interactive text game engine.

# GAME DETAILS
Title: ${game.title}
Genre: ${game.genre}
Subgenre: ${game.subgenre}
Description: ${game.description}
Tagline: ${game.tagline}

${articleContext ? `# ARTICLE CONTEXT (use to enhance narrative authenticity)
${articleContext}

` : ''}# RULES
* Stay in character and maintain the game's tone
* Keep responses relatively short for tight feedback loops
* Always end with exactly 4 numbered options (1. 2. 3. 4.)
* Be concise, witty, and engaging
* Ensure the story aligns with the game description${articleContext ? ' and incorporates themes from the article' : ''}
* Make choices meaningful with real consequences
* Begin each option with the number, period, and space (e.g., "1. ")

Start the game now. Set the scene and present 4 initial choices.`

    return basePrompt
  }

  /**
   * Parse numbered options from AI response
   * Enhanced version of original parseTokenStream.js logic
   * 
   * Handles multiple formats:
   * - "1. Option text"
   * - "1) Option text"
   * - "- Option text" (extracts number from context)
   * - "* 1. Option text"
   */
  private static parseGameOptions(content: string): Array<{ id: number; text: string }> {
    const options: Array<{ id: number; text: string }> = []
    const lines = content.split('\n')

    // Primary pattern: strict "1. " or "1) " format
    const primaryPattern = /^[-*]?\s*(\d+)[.)]\s+(.+)$/

    for (const line of lines) {
      const trimmed = line.trim()

      // Try primary pattern first (most common)
      const match = trimmed.match(primaryPattern)

      if (match && match[2]) {
        const id = parseInt(match[1])
        const text = match[2].trim()

        if (id >= 1 && id <= 4 && text.length > 0) {
          options.push({ id, text })
        }
        continue
      }

      // Fallback pattern: "Option text" after empty line with just number
      // This handles cases where AI formats oddly with numbers on separate lines
      if (trimmed.length > 0 && !trimmed.match(/^\d+$/) && options.length > 0) {
        // Check if this line might be a continuation we should skip
        const lastOption = options[options.length - 1]
        if (lastOption.text && trimmed !== '---') {
          // Don't extend - AI probably meant this as a new option
        }
      }
    }

    // If we found fewer than expected options, try more aggressive parsing
    if (options.length < 2) {
      options.length = 0 // Reset

      // Look for any line with a number 1-4 at start
      for (const line of lines) {
        const trimmed = line.trim()
        // Even more lenient: just a number followed by content
        const match = trimmed.match(/^(\d+)[-.:)\s]+(.+)$/)

        if (match) {
          const id = parseInt(match[1])
          const text = match[2].trim()

          if (id >= 1 && id <= 4 && text.length > 0) {
            // Check if already added (avoid duplicates)
            if (!options.find(o => o.id === id)) {
              options.push({ id, text })
            }
          }
        }
      }
    }

    return options.sort((a, b) => a.id - b.id)
  }
}