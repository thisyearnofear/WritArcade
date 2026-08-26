import { generateText, Output } from 'ai'
import { z } from 'zod'
import { getStructuredOutputModel } from '@/lib/ai-model-compatibility'
import type { UserAIPreferences } from '@/lib/user-ai-preferences.service'
import { clampCopy } from './generation-prompts'

const mood = () =>
  z.object({
    tension: z.number().min(-10).max(10).describe('Stakes for this beat: >5 high-contrast/shadowed, < -5 serene/soft (consumed by MoodModifierService)'),
    chaos: z.number().min(-10).max(10).describe('Linework/shot energy: >5 expressionist/chaotic, < -5 clean/symmetric'),
    hope: z.number().min(-10).max(10).describe('Color palette: >5 radiant/warm, < -5 desaturated/monochrome'),
  })

export const storyPlanSchema = z.object({
  hero: z.object({
    name: z.string().describe('Protagonist name'),
    role: z.string().describe('Role in the source premise (e.g. "the analyst")'),
    desire: z.string().describe('What the hero wants; drives every choice fork'),
    flaw: z.string().describe('Internal obstacle that makes the choices hard'),
    voice: z.string().describe('One-line speaking style the panel narrator uses'),
  }),
  stakes: z.string().describe('What is LOST on failure and why it matters — kept unseen from the player'),
  thesis: z.string().describe('The single idea the story dramatizes (ties panels back to the source)'),
  arc: z.array(
    z.object({
      beat: z.string().describe('Short beat label, e.g. "inciting incident", "escalation", "climax"'),
      intent: z.string().describe('Exactly what this panel must accomplish narratively'),
      scene: z.string().describe('ONE visual subject for this panel; no recap, no dialogue-as-text'),
      mood: mood(),
      dilemmas: z.array(z.string()).min(2).max(4)
        .describe('The practical/ethical forks the player faces this panel'),
    })
  ).min(2).max(5),
  endings: z.array(z.object({
    label: z.string(),
    resolution: z.string().describe('How the story ENDS from the final panel'),
  })).min(2).max(4).describe('The FINAL-panel ending pool — options decide HOW it ends, not what happens next'),
  setup: z.array(z.string()).min(1).max(3).describe('Foreshadowing seeded early to pay off late'),
})

export type StoryPlan = z.infer<typeof storyPlanSchema>
export type StoryPlanArcBeat = StoryPlan['arc'][number]

export interface StoryPlanInput {
  title: string
  description: string
  genre: string
  subgenre?: string
  tagline?: string
  articleContext?: string
}

/**
 * Generate a model-driven story blueprint (Phase 1).
 * Uses the v7 structured-output API (`output: Output.object`) so the model returns
 * a typed `StoryPlan` we can persist and re-consume across panels.
 */
export class StoryPlannerService {
  static async generateStoryPlan(
    input: StoryPlanInput,
    userPreferences?: UserAIPreferences
  ): Promise<StoryPlan> {
    const model = getStructuredOutputModel(userPreferences)

    const context = [
      input.articleContext ? clampCopy(input.articleContext) : input.description ?? '',
      input.tagline,
    ]
      .filter(Boolean)
      .join('\n\n')

    const { output } = await generateText({
      model,
      instructions: `You are the story architect for WritersArcade, an engine that turns source material into 5-panel interactive comics.
Design ONE complete story blueprint from the provided concept. Keep the source's voice and claims intact — dramatize them, don't replace them.
The plan is consumed by a fluid per-panel generator and an image system, so each 'arc' beat's 'scene' must describe ONE concrete visual subject with NO recap.
Keep the player's hidden 'stakes' out of the player-visible text.`,
      prompt: `SOURCE MATERIAL:\n${context}\n\nOUTPUT a StoryPlan for a "${input.genre}" comic (${input.subgenre ?? 'subgenre optional'}) titled "${input.title}".`,
      output: Output.object({ schema: storyPlanSchema }),
    })

    return output
  }
}