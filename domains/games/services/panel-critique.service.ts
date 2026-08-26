import { generateText, Output } from 'ai'
import { z } from 'zod'
import { getStructuredOutputModel } from '@/lib/ai-model-compatibility'
import type { UserAIPreferences } from '@/lib/user-ai-preferences.service'

export const panelCritiqueSchema = z.object({
  passes: z.boolean().describe('True if the narrative is ready as-is.'),
  issues: z.array(z.string()).min(0).max(5).describe('Concrete, actionable flaws (e.g. >4 options, mixed scene, recap, speech-bubble text, too long).'),
  action: z.enum(['keep', 'regenerate', 'revise_image_prompt']).describe(
    'keep = accept; regenerate = re-run the panel with the issues fed back; revise_image_prompt = keep narrative but rebuild the image prompt.'
  ),
})

export type PanelCritique = z.infer<typeof panelCritiqueSchema>

export interface CritiquedInput {
  narrative: string
  imagePrompt?: string
  genre: string
}

/** Max regenerate attempts per panel (Phase 3 safety ceiling). */
export const MAX_CRITIQUE_RETRIES = 2

/**
 * Phase 3: cheap self-reflection critic. Uses v7 structured output to return a
 * typed `PanelCritique` decision instead of raw text.
 */
export class PanelCritiqueService {
  static async critique(input: CritiquedInput, userPreferences?: UserAIPreferences): Promise<PanelCritique> {
    const model = getStructuredOutputModel(userPreferences)

    const { output } = await generateText({
      model,
      instructions:
        'You are a quality critic for an interactive comic panel. Be concrete and terse. Flag only real, actionable defects.',
      prompt: `NARRATIVE:\n${input.narrative}\n\nIMAGE PROMPT:\n${input.imagePrompt ?? '(none)'}\n\nGENRE: ${input.genre}\n\nJudge the narrative + image prompt. Respond with the structured schema.`,
      output: Output.object({ schema: panelCritiqueSchema }),
      maxOutputTokens: 400,
    })

    return output
  }
}

/** Build a short directive string from a critique to feed a regenerate. */
export function critiqueDirective(critique: PanelCritique): string {
  if (critique.action === 'regenerate') {
    return `CRITIQUE: your last panel failed review. Fix these issues and produce a compliant panel:\n- ${critique.issues.join('\n- ')}`
  }
  if (critique.action === 'revise_image_prompt') {
    return `IMAGE CRITIQUE (keep the narrative): ${critique.issues.join('; ')}`
  }
  return ''
}