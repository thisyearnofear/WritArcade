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
     * Story-aware version with panel pacing awareness
     * Enforces 2-3 sentences per panel with intelligent escalation
     * Maintains thematic connection to source article if provided
     */
  static async* chatGame(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    userInput: string,
    model: string = 'gpt-4o-mini',
    currentPanel: number = 1,
    maxPanels: number = 5,
    articleContext?: string
  ): AsyncGenerator<GameplayResponse> {

    const aiModel = getModel(model)

    // Build story pacing guidance based on position in narrative
    const paceGuidance = this.getPacingGuidance(currentPanel, maxPanels)

    // Add system message enforcing word count and pacing to conversation
    const conversationMessages = [
      ...messages,
      { role: 'user' as const, content: userInput }
    ]

    try {
      const { textStream } = await streamText({
        model: aiModel,
        messages: conversationMessages,
        system: `You are a comic-style game engine for a ${maxPanels}-panel story (currently at panel ${currentPanel}).

  SCENE FOCUS: Describe ONE scene only. Do NOT recap previous scenes or include flashbacks. Focus entirely on the NEW moment resulting from the user's choice.

  LENGTH REQUIREMENT: Keep narrative to exactly 2-3 sentences maximum. Use vivid, visual language that's punchy and engaging. Every sentence should describe the CURRENT scene.

  ${articleContext ? `\n  THEMATIC CONTINUITY: Keep the player's choices and journey grounded in the themes from the source article:\n  ${articleContext.split('\n').slice(0, 3).join('\n  ')}\n  Every moment should reinforce why this game was created based on that material.` : ''}

  ${paceGuidance}

  ${currentPanel === maxPanels 
    ? 'FINAL PANEL RULES: This story MUST conclude. The options should lead to different endings/resolutions, not continue the story. Make choices about HOW the story ends, not what happens next.'
    : 'CRITICAL: Always end with exactly 4 numbered options (1. 2. 3. 4.) on separate lines.'
  }`
      })

      let content = ''

      for await (const delta of textStream) {
        content += delta
        yield {
          type: 'content',
          content: delta,
        }
      }

      // Enforce sentence limits (2-3 sentences)
      const trimmedContent = this.enforceSentenceCount(content, 2, 3)
      
      if (trimmedContent !== content) {
        const wordCount = trimmedContent.split(/\s+/).filter(w => w.length > 0).length
        console.log(`[Panel ${currentPanel}/${maxPanels}] Word count enforced: ${wordCount} words`)
      }

      // Parse options from response
      const options = this.parseGameOptions(trimmedContent)

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
   * Provide pacing guidance based on story position
   * Helps AI understand narrative structure and when to escalate/resolve
   */
  private static getPacingGuidance(currentPanel: number, maxPanels: number): string {
    if (currentPanel === 1) {
      return `PANEL 1/5: OPENING & HOOK
Establish the setting and main character quickly. Introduce the central conflict or mystery. Hook the reader immediately with an engaging situation.`
    } else if (currentPanel === 2) {
      return `PANEL 2/5: DEVELOPMENT & COMPLICATION
Develop the conflict introduced in panel 1. Add a complication or twist. Deepen the stakes - what's really at risk?`
    } else if (currentPanel === 3) {
      return `PANEL 3/5: RISING ACTION & ESCALATION
CRITICAL: Halfway point - escalate dramatically! Introduce the biggest challenge or reveal. Build toward the climax. Time is running out!`
    } else if (currentPanel === 4) {
      return `PANEL 4/5: CLIMAX & TURNING POINT
URGENT: This is the climactic moment! Face the main conflict head-on. Major decisions with serious consequences. The story's peak tension happens NOW.`
    } else if (currentPanel === 5) {
      return `PANEL 5/5: FINAL RESOLUTION
CONCLUSION REQUIRED: This is the FINAL panel. You MUST bring the story to a satisfying conclusion. Resolve the central conflict, show consequences of choices, and provide closure. No cliffhangers - the story ends here!`
    } else {
      return `STORY COMPLETE: No more panels should be generated.`
    }
  }

  /**
   * Enforce sentence count between min and max
   * Extracts narrative before options and trims/adjusts sentence count
   */
  private static enforceSentenceCount(content: string, minSentences: number, maxSentences: number): string {
    // Find where options start
    const optionStartPattern = /^[-*]?\s*1[.)]\s+/m
    const match = content.match(optionStartPattern)

    if (!match || !match.index) {
      // No options found, trim narrative to sentence count
      return this.trimToSentenceCount(content, minSentences, maxSentences)
    }

    // Split narrative from options
    const narrativeSection = content.substring(0, match.index).trim()
    const optionsSection = content.substring(match.index).trim()

    // Trim narrative to sentence count range
    const trimmedNarrative = this.trimToSentenceCount(narrativeSection, minSentences, maxSentences)

    // Combine trimmed narrative with all options
    return trimmedNarrative + '\n\n' + optionsSection
  }

  /**
   * Trim text to a specific sentence count range
   */
  private static trimToSentenceCount(text: string, minSentences: number, maxSentences: number): string {
    // Split by sentence endings
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    // If already within range, return as-is
    if (sentences.length >= minSentences && sentences.length <= maxSentences) {
      return text
    }

    // If too long, truncate to maxSentences
    if (sentences.length > maxSentences) {
      const trimmed = sentences.slice(0, maxSentences).join('. ').trim()
      return trimmed + (trimmed.endsWith('.') ? '' : '.')
    }

    // If too short, return what we have
    return text
  }

  /**
   * Enforce word count between min and max (legacy)
   * Extracts narrative before options and trims/adjusts word count
   */
  private static enforceWordCount(content: string, minWords: number, maxWords: number): string {
    // Find where options start
    const optionStartPattern = /^[-*]?\s*1[.)]\s+/m
    const match = content.match(optionStartPattern)

    if (!match || !match.index) {
      // No options found, trim narrative to word count
      return this.trimToWordCount(content, minWords, maxWords)
    }

    // Split narrative from options
    const narrativeSection = content.substring(0, match.index).trim()
    const optionsSection = content.substring(match.index).trim()

    // Trim narrative to word count range
    const trimmedNarrative = this.trimToWordCount(narrativeSection, minWords, maxWords)

    // Combine trimmed narrative with all options
    return trimmedNarrative + '\n\n' + optionsSection
  }

  /**
   * Trim text to a specific word count range
   * Prefers to keep near maxWords but respects minWords floor
   */
  private static trimToWordCount(text: string, minWords: number, maxWords: number): string {
    const words = text.split(/\s+/).filter(w => w.length > 0)
    
    // If already within range, return as-is
    if (words.length >= minWords && words.length <= maxWords) {
      return words.join(' ')
    }

    // If too long, truncate to maxWords and find sentence boundary
    if (words.length > maxWords) {
      let truncated = words.slice(0, maxWords).join(' ')
      
      // Try to end at sentence boundary
      const lastPeriod = Math.max(
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('!'),
        truncated.lastIndexOf('?')
      )
      
      if (lastPeriod > minWords / 6) {
        // If we can end at a sentence and still have decent length, do it
        truncated = truncated.substring(0, lastPeriod + 1)
      }
      
      return truncated
    }

    // If too short, return what we have (AI should respect word count in future attempts)
    return words.join(' ')
  }

  /**
    * Build generation prompt (enhanced from original)
    * 
    * ARTICLE INTEGRITY FIRST: When article content is provided, its themes must be
    * authentically interpreted in the game. Genre/difficulty are secondary flavoring,
    * not primary constraints.
    */
  private static buildGenerationPrompt(
    promptText: string,
    customization?: { genre?: string; difficulty?: string }
  ): string {
    let basePrompt = `You are GameCreator-GPT, an AI specializing in generating game ideas that authentically capture the essence of source material.

  Your PRIMARY obligation is to create a game that faithfully interprets the article's core themes and arguments.
  Secondary constraints (genre/difficulty) should enhance—not override—thematic authenticity.`

    // Detect if this is article-based generation
    const isArticleContent = promptText?.includes('article:') || promptText?.includes('Article:')
    
    if (isArticleContent) {
      basePrompt += `

  CRITICAL: ARTICLE THEMATIC INTEGRATION
  ========================================
  The following article content defines your creative direction. Every game element MUST connect to its themes:
  - Title, description, and tagline should reference or evoke the article's core ideas
  - Game mechanics should reflect the article's arguments or narrative arc
  - The subgenre should authentically represent the article's tone and subject matter
  - Avoid generic "adventure" framing—this game must be specifically about this article's concepts

  ${promptText}

  After reading the above, you will design a game that makes readers think differently about these concepts.`
    } else if (promptText) {
      basePrompt += `\n\nCreate a game based on this concept: ${promptText}`
    }

    // Genre and difficulty are secondary flourishes
    if (customization?.genre) {
      basePrompt += `\n\nAPPLY GENRE FLAVOR: The game's aesthetic should feel "${customization.genre}", but only if it enhances the core theme. The genre field MUST be set to "${customization.genre}".`
    }

    if (customization?.difficulty) {
      const difficultyGuide =
        customization.difficulty === 'easy'
          ? 'Make it accessible: straightforward choices, clear consequences, simple mechanics.'
          : 'Make it challenging: complex choices, hidden mechanics, non-obvious consequences.'
      basePrompt += `\n\nDIFFICULTY FLAVOR: ${difficultyGuide}`
    }

    basePrompt += `

  Please provide a JSON response with the following structure:
  - title: Game title that connects to the article's core idea
  - genre: Main genre (e.g., "Mystery", "Adventure", "Sci-Fi")${customization?.genre ? ` - MUST be "${customization.genre}"` : ''}
  - subgenre: Specific subgenre that reflects the article's tone/subject
  - description: How this game authentically interprets the article's themes${customization?.difficulty ? ` with ${customization.difficulty} difficulty` : ''}
  - tagline: A statement that captures the game's thematic core (not just witty)
  - primaryColor: A hex color with high contrast against #000000`

    return basePrompt
  }

  /**
    * Build start game prompt (enhanced from original)
    * ARTICLE CONTEXT INTEGRATION: When provided, article themes guide the narrative
    * so players engage with the source material's ideas, not a generic adventure
    * Enforces 2-3 sentences for opening panel
    */
  private static buildStartGamePrompt(game: any, articleContext?: string): string {
    const basePrompt = `You are an interactive text game engine designed for visual comic-style gameplay.
  The game's opening must ground players in the world and themes they're about to explore.

  # GAME DETAILS
  Title: ${game.title}
  Genre: ${game.genre}
  Subgenre: ${game.subgenre}
  Description: ${game.description}
  Tagline: ${game.tagline}

  ${articleContext ? `# SOURCE MATERIAL CONTEXT (This is the heart of the game)
  The following article inspired this game. Your opening scene should make players feel
  the article's core themes, questions, or dilemmas. Reference the article's concepts
  in how you frame the world, the character's challenge, and the initial choice.

  ${articleContext}

  OPENING SCENE REQUIREMENT:
  - Frame the game world in a way that reflects the article's themes
  - Present the player's initial challenge as a direct interpretation of the article's core question/argument
  - Use language that echoes or references the article's key concepts
  ` : `# OPENING SCENE REQUIREMENT:
  - Establish an engaging world and central conflict
  `}

  # CRITICAL RULES - COMIC PANEL FORMAT
  * Keep narrative to exactly 2-3 sentences maximum describing ONE SCENE ONLY
  * Use vivid, visual language that translates to imagery
  * Paint clear pictures for the comic panel image
  * No lengthy backstory or explanations - show, don't tell
  * Every sentence must depict the CURRENT scene being visualized
  * Dramatic and engaging tone only
  * Always end with exactly 4 numbered options (1. 2. 3. 4.)
  * Begin each option with the number, period, and space (e.g., "1. ")
  * Make choices meaningful with real consequences
  ${articleContext ? '\n  * Your options should present different approaches to the article\'s central dilemma' : ''}

  Start the game now. Describe the opening scene vividly in 2-3 sentences, then present 4 initial choices.`

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