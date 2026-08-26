import { generateObject, streamText } from 'ai'
import { z } from 'zod'
import type {
  GameGenerationRequest,
  GameGenerationResponse,
  GameplayResponse,
  AssetGenerationRequest,
  AssetGenerationResponse
} from '../types'
import type { UserAIPreferences } from '@/lib/user-ai-preferences.service'
import { getModel, hasGeminiConfiguration, hasVeniceConfiguration } from '@/lib/ai-model-compatibility'
import { isFeatureEnabled } from '@/lib/config'
import { StoryPlannerService } from './story-planner.service'
import type { StoryPlan } from './story-planner.service'


// Game generation schema for structured output
const gameGenerationSchema = z.object({
  title: z.string(),
  description: z.string(),
  tagline: z.string(),
  genre: z.string(),
  subgenre: z.string(),
  primaryColor: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/),
})

// Asset generation schema for structured output (ENHANCEMENT FIRST: reuse validation pattern)
const assetGenerationSchema = z.object({
  title: z.string().describe('Asset pack title that captures its essence'),
  description: z.string().describe('Description of what makes this asset pack unique'),
  characters: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      personality: z.string().describe('2-3 sentence personality description'),
      motivation: z.string().describe('What drives this character'),
      appearance: z.string().describe('Visual description for game illustration'),
    })
  ).min(2).max(5).describe('2-5 character profiles for this asset pack'),
  storyBeats: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      keyConflict: z.string(),
      emotionalTone: z.string(),
    })
  ).min(3).max(5).describe('3-5 story beats or narrative structure elements'),
  gameMechanics: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      mechanics: z.array(z.string()).describe('List of specific mechanics or rules'),
      consequence: z.string().describe('What happens when this mechanic is used'),
    })
  ).min(2).max(4).describe('2-4 core game mechanics'),
  visualGuidelines: z.object({
    colorPalette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).min(3).max(6),
    artStyle: z.string().describe('e.g., "noir comic", "cel animation", "watercolor"'),
    atmosphere: z.string().describe('Overall mood and setting'),
    symbolism: z.string().describe('Key visual symbols or motifs'),
  }).describe('Visual direction for games using this asset pack'),
})

/**
 * Consolidated Game AI Service
 * Merges GenerateGame.js, StartGame.js, and ChatGame.js functionality
 */
export class GameAIService {

  private static isLikelyProviderFailure(errorMessage: string): boolean {
    const normalized = errorMessage.toLowerCase()
    return (
      normalized.includes('insufficient_quota') ||
      normalized.includes('quota') ||
      normalized.includes('rate limit') ||
      normalized.includes('429') ||
      normalized.includes('api') ||
      normalized.includes('provider') ||
      normalized.includes('failed after')
    )
  }

  /**
   * Generate a new game from prompt text or URL content
   * Enhanced version of original GenerateGame.js
   *
   * Supports optional customization (genre, difficulty) for mini-app experience
   * Includes validation and retry logic for customization constraints
   */
  static async generateGame(request: GameGenerationRequest, retryCount = 0, userPreferences?: UserAIPreferences): Promise<GameGenerationResponse> {
    const maxRetries = 2

    let promptText = request.promptText || ''

    // If URL provided, we'll handle content extraction separately
    if (request.url && !promptText) {
      promptText = `Generate a game based on content from: ${request.url}`
    }

    const prompt = this.buildGenerationPrompt(promptText, request.customization)
    
    console.log('GameAIService.generateGame called:', {
      retryCount,
      modelName: request.model,
      hasCustomization: !!request.customization,
      promptLength: prompt.length,
    })

    try {
      const model = getModel(request.model || '', userPreferences)
      console.log('Calling generateObject with model...')
      const { object: game } = await generateObject({
        model,
        schema: gameGenerationSchema,
        prompt,
      })
      console.log('generateObject returned:', { title: game.title, genre: game.genre })

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

      const response: GameGenerationResponse = {
        title: game.title,
        description: game.description,
        tagline: game.tagline,
        genre: game.genre,
        subgenre: game.subgenre,
        primaryColor: game.primaryColor,
        promptModel: request.model || (hasVeniceConfiguration() ? 'llama-3.3-70b' : hasGeminiConfiguration(userPreferences) ? 'gemini-2.0-flash' : 'gpt-4o-mini'),
        promptName: request.promptName || `GenerateGame-v2${retryCount > 0 ? `-retry${retryCount}` : ''}`,
        promptText: request.promptText,
      }

      // Phase 1: model-driven story plan (additive, non-blocking on failure).
      if (isFeatureEnabled('agentPlan')) {
        try {
          const plan = await StoryPlannerService.generateStoryPlan(
            {
              title: game.title,
              description: game.description,
              genre: game.genre,
              subgenre: game.subgenre,
              tagline: game.tagline,
              articleContext: request.promptText,
            },
            userPreferences
          )
          response.agentPlan = plan
        } catch (planError) {
          console.error('Story plan generation failed (non-blocking):', planError)
        }
      }

      return response
    } catch (error) {
      console.error('Game generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown AI generation error'

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

      if (
        retryCount < maxRetries &&
        error instanceof Error &&
        request.model?.startsWith('venice') &&
        hasGeminiConfiguration(userPreferences)
      ) {
        console.warn(`Venice failed. Retrying with Gemini fallback (${retryCount + 1}/${maxRetries})`)
        return this.generateGame({ ...request, model: 'gemini-3.1-flash-preview' }, retryCount + 1, {
          geminiEnabled: true,
          googleApiKey: userPreferences?.googleApiKey,
          preferGemini: true,
          imageQuality: userPreferences?.imageQuality || 'fast'
        })
      }

      if (
        retryCount < maxRetries &&
        error instanceof Error &&
        request.model?.startsWith('gemini') &&
        !request.model?.startsWith('venice')
      ) {
        console.warn(`Gemini failed. Retrying with OpenAI fallback (${retryCount + 1}/${maxRetries})`)
        return this.generateGame({ ...request, model: 'gpt-4o-mini' }, retryCount + 1, {
          geminiEnabled: userPreferences?.geminiEnabled ?? false,
          googleApiKey: userPreferences?.googleApiKey,
          preferGemini: false,
          imageQuality: userPreferences?.imageQuality || 'fast'
        })
      }

      if (
        retryCount < maxRetries &&
        error instanceof Error &&
        userPreferences?.preferGemini &&
        hasVeniceConfiguration() &&
        !request.model?.startsWith('venice')
      ) {
        console.warn(`Gemini failed/refused. Retrying with Venice fallback (${retryCount + 1}/${maxRetries})`)
        return this.generateGame({ ...request, model: 'llama-3.3-70b' }, retryCount + 1, {
          ...userPreferences,
          preferGemini: false,
        })
      }

      if (
        retryCount < maxRetries &&
        error instanceof Error &&
        hasVeniceConfiguration() &&
        !request.model?.startsWith('venice') &&
        !request.model?.startsWith('llama') &&
        this.isLikelyProviderFailure(error.message)
      ) {
        console.warn(`Provider request failed. Retrying with Venice (${retryCount + 1}/${maxRetries})`)
        return this.generateGame({ ...request, model: 'llama-3.3-70b' }, retryCount + 1, userPreferences)
      }

      throw new Error(
        retryCount > 0
          ? `AI generation failed after ${retryCount + 1} attempts: ${errorMessage}`
          : `AI generation failed: ${errorMessage}`
      )
    }
  }

  /**
   * Generate reusable game assets from article content
   * Asset Marketplace feature (Sprint 1)
   *
   * Extracts: Characters, Story Beats, Game Mechanics, Visual Guidelines
   * Reuses: Same model provider, error handling, retry logic as generateGame()
   *
   * ENHANCEMENT FIRST: Follows same pattern as generateGame for consistency
   */
  static async generateAssets(
    request: AssetGenerationRequest,
    retryCount = 0,
    userPreferences?: UserAIPreferences
  ): Promise<AssetGenerationResponse> {
    const model = getModel(request.model || 'gpt-4o-mini', userPreferences)
    const maxRetries = 2

    const promptText = request.promptText || ''
    let articleThemes = ''

    // If URL provided, and promptText is derived from it
    if (request.url && request.promptText) {
        // Extract themes and provenance snippets for grounded generation
        articleThemes = await import('@/domains/content/services/content-processor.service')
            .then(m => m.ContentProcessorService.extractArticleThemes(request.promptText!))
    }

    const prompt = this.buildAssetGenerationPrompt(promptText, request.genre, articleThemes)

    try {
      const { object: assets } = await generateObject({
        model,
        schema: assetGenerationSchema,
        prompt,
      })

      // Type assertion safe: Zod schema enforces all required fields
      return {
        title: assets.title!,
        description: assets.description!,
        characters: assets.characters!,
        storyBeats: assets.storyBeats!,
        gameMechanics: assets.gameMechanics!,
        visualGuidelines: assets.visualGuidelines!,
      } as AssetGenerationResponse
    } catch (error) {
      console.error('Asset generation error:', error)

      // If this is a validation error and we have retries left, retry with stricter prompt
      if (retryCount < maxRetries && error instanceof Error) {
        console.warn(`Asset generation validation failed. Retrying (${retryCount + 1}/${maxRetries})`)

        // Add stricter instructions
        const stricterRequest = {
          ...request,
          promptText: `You MUST provide ONLY valid JSON with these exact fields: title, description, characters, storyBeats, gameMechanics, visualGuidelines. No additional text.\n\n${promptText}`,
        }
        return this.generateAssets(stricterRequest, retryCount + 1)
      }

      throw new Error(
        retryCount > 0
          ? `Failed to generate assets after ${retryCount + 1} attempts`
          : 'Failed to generate assets'
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
    articleContext?: string,
    userPreferences?: UserAIPreferences,
    plan?: StoryPlan
  ): AsyncGenerator<GameplayResponse> {

    const aiModel = getModel(model, userPreferences)
    const prompt = this.buildStartGamePrompt(game, articleContext, plan)

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      // Yield error event so client can display it
      yield {
        type: 'error' as const,
        error: `Failed to start game: ${errorMessage}`,
      }
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
    articleContext?: string,
    userPreferences?: UserAIPreferences,
    plan?: StoryPlan
  ): AsyncGenerator<GameplayResponse> {

    const aiModel = getModel(model, userPreferences)

    // Build story pacing guidance based on position in narrative
    const paceGuidance = this.getPacingGuidance(currentPanel, maxPanels, plan)

    // Add system message enforcing word count and pacing to conversation
    const conversationMessages = [
      ...messages,
      { role: 'user' as const, content: userInput }
    ]

    try {
      const { textStream } = await streamText({
        model: aiModel,
        messages: conversationMessages,
        instructions: `You are a comic-style game engine for a ${maxPanels}-panel story (currently at panel ${currentPanel}).

  SCENE FOCUS: Describe ONE scene only. Do NOT recap previous scenes or include flashbacks. Focus entirely on the NEW moment resulting from the user's choice.

  LENGTH REQUIREMENT: Keep narrative to exactly 2-3 sentences maximum. Use vivid, visual language that's punchy and engaging. Every sentence should describe the CURRENT scene.

  FORMAT REQUIREMENT: Write ONLY the scene description. Do NOT include labels like "Opening Scene", "Scene 1", "The scene shows", or any other introductory text. Start immediately with the action and description.

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      yield {
        type: 'error' as const,
        error: `Failed to process game input: ${errorMessage}`,
      }
    }
  }

  /**
   * Provide pacing guidance based on story position
   * Helps AI understand narrative structure and when to escalate/resolve
   */
  private static getPacingGuidance(currentPanel: number, _maxPanels: number, plan?: StoryPlan): string {
    // Phase 1: model-driven beat steering. Prefer the storyboard's intent/mood for
    // this panel; fall back to the fixed arc template when no plan is present.
    if (plan?.arc && plan.arc[currentPanel - 1]) {
      const beat = plan.arc[currentPanel - 1]
      return `PLANNED BEAT (panel ${currentPanel}): ${beat.beat}
INTENT: ${beat.intent}
MOOD: tension=${beat.mood.tension}, chaos=${beat.mood.chaos}, hope=${beat.mood.hope}
${currentPanel === plan.arc.length
      ? 'FINAL PANEL RULES: This story MUST conclude. The options should lead to different endings/resolutions, not continue the story. Make choices about HOW the story ends, not what happens next.'
      : 'CRITICAL: Always end with exactly 4 numbered options (1. 2. 3. 4.) on separate lines.'}`
    }
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

  CRITICAL: ARTICLE THEMATIC INTEGRATION (ENHANCED)
  ==================================================
  The following article content defines your creative direction. Every game element MUST connect to its themes AND particulars:
  - Title, description, and tagline should reference or evoke the article's core ideas AND specific examples
  - Game mechanics should reflect the article's arguments, narrative arc, AND key details
  - The subgenre should authentically represent the article's tone, subject matter, AND specific scenarios
  - Avoid generic "adventure" framing—this game must be specifically about this article's concepts AND particulars
  - Capture at least 3-5 specific details, examples, or quotes from the article to make the game feel authentic

  ${promptText}

  After reading the above, you will design a game that:
  1. Makes readers think differently about these concepts
  2. Includes 3-5 specific references to article content (quotes, examples, data points)
  3. Feels like it could only be about this specific article, not a generic version`
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
    * Build asset generation prompt (NEW: Asset Marketplace)
    * 
    * ENHANCEMENT FIRST: Reuses buildGenerationPrompt pattern
    * Extracts reusable game components instead of complete games
    * Genre is optional for assets (less critical than for full games)
    */
    private static buildAssetGenerationPrompt(
    promptText: string,
    genre?: string,
    articleThemes?: string
    ): string {
    let basePrompt = `You are AssetCreator-GPT, specialized in extracting reusable game components from source material.

    Your task is to decompose an article into game asset components that others can use to create multiple different games.
    These assets are the building blocks—characters, mechanics, story beats, visual style—not a complete game.`

    // Include Article Provenance if available (Provenance Snippets)
    if (articleThemes) {
        basePrompt += `

    CRITICAL: ARTICLE PROVENANCE (GROUNDING)
    ========================================
    Every asset MUST be grounded in the following article themes and specific snippets.
    For each asset, ensure it relates to these concepts and snippets:
    ${articleThemes}

    If an asset does not directly relate to one of these themes, do not include it.`
    } else if (promptText) {
        basePrompt += `\n\nExtract game assets from this concept: ${promptText}`
    }

    // Genre is secondary for assets (different games may use different genres)
    if (genre) {
      basePrompt += `\n\nGENRE SUGGESTION: Assets should work well in "${genre}" games, but are not limited to this genre.`
    }

    basePrompt += `

    Please provide a JSON response with the following structure:
    - title: Asset pack title (e.g., "Web3 Pioneers", "Climate Futures")
    - description: What makes this asset pack unique and useful
    - characters: 2-5 character profiles with name, role, personality, motivation, appearance
    - storyBeats: 3-5 narrative beats or plot structures extracted from the material
    - gameMechanics: 2-4 core game mechanics that model the article's systems
    - visualGuidelines: Color palette, art style, atmosphere, and visual symbolism

    Focus on extracting the ESSENCE of the material—components others can remix into different games.`

    return basePrompt
    }

    /**
     * Build start game prompt (enhanced from original)
    * ARTICLE CONTEXT INTEGRATION: When provided, article themes guide the narrative
    * so players engage with the source material's ideas, not a generic adventure
    * Enforces 2-3 sentences for opening panel
    */
  private static buildStartGamePrompt(game: { title: string, description: string, genre: string, subgenre: string, tagline: string, articleContext?: string }, articleContext?: string, plan?: StoryPlan): string {
    const storyboard = plan?.arc?.[0] && plan.hero
      ? [
          '# STORYBOARD (Phase 1 plan — keep the protagonist\'s point of view and this beat)',
          `HERO: ${plan.hero.name} (${plan.hero.role}) — ${plan.hero.desire}`,
          `VOICE: ${plan.hero.voice}`,
          `OPENING BEAT: ${plan.arc[0].beat} — ${plan.arc[0].intent}`,
          `MOOD: tension=${plan.arc[0].mood.tension}, chaos=${plan.arc[0].mood.chaos}, hope=${plan.arc[0].mood.hope}`,
          `Dilemmas to seed: ${plan.arc[0].dilemmas.join(' | ')}`,
          '',
        ].join('\n')
      : ''
    const basePrompt = `You are an interactive text game engine designed for visual comic-style gameplay.
  The game's opening must ground players in the world and themes they're about to explore.

  ${storyboard}
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

  /**
   * Generate a secret panel (6th panel epilogue) for NFT-gated content.
   * This panel is encrypted on-chain via Inco and only accessible to NFT holders.
   *
   * ENHANCEMENT FIRST: Reuses existing model provider and error handling patterns
   */
  static async generateSecretPanel(
    game: { title: string; description: string; genre: string; tagline: string },
    articleContext?: string,
    userPreferences?: import('@/lib/user-ai-preferences.service').UserAIPreferences
  ): Promise<{ narrative: string; imagePrompt: string }> {
    const model = getModel('', userPreferences)

    const prompt = `You are a narrative designer creating a SECRET EPILOGUE for an interactive comic game.

GAME: "${game.title}" (${game.genre})
TAGLINE: "${game.tagline}"
DESCRIPTION: "${game.description}"
${articleContext ? `\nSOURCE ARTICLE CONTEXT:\n${articleContext}\n` : ''}

Your task: Write a SECRET PANEL — a 2-3 sentence epilogue that reveals something hidden. This panel is only accessible to owners of the game's NFT.

The secret panel should:
1. Reveal a hidden truth, alternate perspective, or surprising consequence not shown in panels 1-5
2. Feel like a "director's cut" or "post-credits scene" — rewarding for the dedicated player
3. Match the game's tone and genre
4. End with intrigue or a twist that makes the reader reconsider the entire game

Also provide a detailed image generation prompt for a comic panel illustration that matches this secret scene.

Respond in JSON:
{
  "narrative": "The 2-3 sentence secret epilogue text",
  "imagePrompt": "A detailed image generation prompt for a comic panel illustrating this secret scene"
}`

    try {
      const { object: result } = await generateObject({
        model,
        schema: z.object({
          narrative: z.string().min(20).max(500),
          imagePrompt: z.string().min(10).max(300),
        }),
        prompt,
      })

      return {
        narrative: result.narrative,
        imagePrompt: result.imagePrompt,
      }
    } catch (error) {
      console.error('Secret panel generation failed:', error)
      // Graceful fallback — game still works without the secret panel
      return {
        narrative: `The story continues beyond what you've seen... Some truths reveal themselves only to those who truly own the experience.`,
        imagePrompt: `A mysterious comic panel with dramatic shadows, ${game.genre} style, showing a hidden doorway or concealed truth`,
      }
    }
  }

  /**
   * Generate a game panel with a hidden Inco modifier constraint.
   *
   * The modifier is an encrypted "card" drawn from the DailyChallengeVault deck.
   * The AI receives the modifier's prompt as a system constraint, shaping the
   * narrative — but the player doesn't know which modifier they drew until the
   * finale reveal.
   *
   * @param modifierPrompt - The constraint prompt from the modifier card
   * @param panelIndex - Which panel (0-4)
   * @param basePrompt - The user's input (article text, marketing copy, BasePaint theme)
   * @param previousPanels - Narrative context from prior panels
   * @param userPreferences - AI model preferences
   * @returns Streamed gameplay response with narrative + choices
   */
  static async *generatePanelWithModifier(
    modifierPrompt: string,
    panelIndex: number,
    basePrompt: string,
    previousPanels: Array<{ narrative: string; choice?: string }>,
    userPreferences?: UserAIPreferences,
    plan?: StoryPlan
  ): AsyncGenerator<GameplayResponse> {
    const model = getModel('', userPreferences)
    const maxPanels = 5

    const paceGuidance = this.getPacingGuidance(panelIndex + 1, maxPanels, plan)

    const contextPanel = previousPanels.length > 0
      ? `\nPREVIOUS PANELS:\n${previousPanels.map((p, i) => `Panel ${i + 1}: ${p.narrative}${p.choice ? ` → Player chose: ${p.choice}` : ''}`).join('\n')}\n`
      : ''

    const system = `You are a comic-style game engine for a ${maxPanels}-panel interactive story.
You are currently generating panel ${panelIndex + 1} of ${maxPanels}.

HIDDEN MODIFIER (the player does NOT know this — shape the narrative around it without revealing it explicitly):
${modifierPrompt}

SCENE FOCUS: Describe ONE scene only. Do NOT recap previous scenes or include flashbacks.
LENGTH REQUIREMENT: Keep narrative to exactly 2-3 sentences maximum.
FORMAT REQUIREMENT: Write ONLY the scene description. Do NOT include labels like "Opening Scene", "Scene 1", or any introductory text.
${contextPanel}
${paceGuidance}
${panelIndex + 1 === maxPanels
      ? 'FINAL PANEL RULES: This story MUST conclude. The options should lead to different endings/resolutions, not continue the story. Make choices about HOW the story ends, not what happens next.'
      : 'CRITICAL: Always end with exactly 4 numbered options (1. 2. 3. 4.) on separate lines.'
    }`

    try {
      const { textStream } = await streamText({
        model,
        instructions: system,
        prompt: basePrompt,
      })

      let currentMessage = ''
      for await (const chunk of textStream) {
        currentMessage += chunk

        // Try to split narrative from options
        const optionStartRegex = /[\n\r]+\s*1[.)]\s+/
        const match = currentMessage.match(optionStartRegex)

        if (match && match.index !== undefined) {
          const narrative = currentMessage.substring(0, match.index).trim()
          const optionsText = currentMessage.substring(match.index)

          const options = this.parseGameOptions(optionsText)

          if (options.length > 0) {
            yield {
              type: 'content',
              content: narrative,
            }
            yield {
              type: 'options',
              options,
            }
            return
          }
        }

        // Stream content
        yield {
          type: 'content',
          content: chunk,
        }
      }

      // Final yield for last panel (may not have options)
      const trimmedContent = this.enforceSentenceCount(currentMessage, 2, 3)
      const options = this.parseGameOptions(trimmedContent)

      yield {
        type: 'content',
        content: options.length > 0
          ? trimmedContent.split(/[\n\r]+\s*1[.)]\s+/)[0].trim()
          : trimmedContent,
      }
      if (options.length > 0) {
        yield { type: 'options', options }
      }
      yield { type: 'end' }
    } catch (error) {
      console.error(`[Modifier Panel ${panelIndex + 1}] Generation failed:`, error)
      yield {
        type: 'content',
        content: 'The story takes an unexpected turn...',
      }
      yield {
        type: 'options',
        options: [
          { id: 1, text: 'Investigate further' },
          { id: 2, text: 'Take a different path' },
          { id: 3, text: 'Ask for help' },
          { id: 4, text: 'Wait and see' },
        ],
      }
      yield { type: 'end' }
    }
  }
}