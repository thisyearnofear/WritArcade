import { ToolLoopAgent, isStepCount } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/ai-model-compatibility'
import { isFeatureEnabled } from '@/lib/config'
import type { StoryPlan } from './story-planner.service'
import { ContentProcessorService } from '@/domains/content/services/content-processor.service'
import { ImageGenerationService, type ImageGenerationResult } from './image-generation.service'
import { clampCopy } from './generation-prompts'
import type { GameplayResponse } from '../types'

/** Thin budget/trace bookkeeping shared by the agent loop. */
export interface AgentBudget {
  /** Total allowed output tokens across all agent steps. */
  maxTokens: number
  spent: number
}

export interface AgentToolTrace {
  step: number
  tool: string
  argsHash: string
  model: string
  tokens: number
  at: string
}

/** Source the tools operate over (game + article). */
export interface PanelAgentContext {
  genre: string
  title: string
  plan?: StoryPlan
  /** Raw article text already extracted from Paragraph. */
  articleText?: string
  modelLabel: string
  budget: AgentBudget
  traces: AgentToolTrace[]
}

/** Result assembled from the agent's `done` tool (or fallback narrative). */
export interface GeneratedPanel {
  narrative: string
  image?: ImageGenerationResult | null
  options: GameplayOption[]
  /** Tool-call telemetry captured during assembly (persisted to Game.agentTraces). */
  traces: AgentToolTrace[]
  budget: AgentBudget
}

export interface GameplayOption {
  id: number
  text: string
}

/** Cheap deterministic hash for trace args (not cryptographic). */
function argsHash(payload: unknown): string {
  const pick = typeof payload === 'string' ? payload.slice(0, 80) : JSON.stringify(payload)?.slice(0, 120)
  let h = 0
  for (let i = 0; i < (pick?.length ?? 0); i++) {
    h = (h * 31 + (pick!.charCodeAt(i) || 0)) >>> 0
  }
  return h.toString(16)
}

/** Extract a verbatim quote around a keyword from article text. */
function quoteForSnippet(article: string | undefined, keyword: string): string {
  if (!article) return ''
  const idx = article.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) {
    // Fall back to first 140 chars of article.
    return article.slice(0, 140)
  }
  return article.slice(Math.max(0, idx - 60), Math.min(article.length, idx + keyword.length + 60))
}

// Regex-based option parse reused from the procedural path.
function parseGameOptions(text: string): GameplayOption[] {
  const options: GameplayOption[] = []
  const pattern = /(?:^|\n)\s*([1-9])[.)]\s+([^\n]+)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null && options.length < 4) {
    options.push({ id: Number(match[1]), text: match[2].trim() })
  }
  return options
}

// ---------------------------------------------------------------------------
// Panel tools
// ---------------------------------------------------------------------------

function buildPanelTools(ctx: () => PanelAgentContext) {
  return {
    refreshArticle: {
      description:
        'Pull the freshest Paragraph source text when the current beat needs more grounding. Provide the article URL as the "prompt".',
      inputSchema: z.object({ prompt: z.string() }),
      execute: async ({ prompt }: { prompt: string }) => {
        const c = ctx()
        try {
          const processed = await ContentProcessorService.processUrl(prompt)
          const clamped = clampCopy(processed.text)
          c.articleText = clamped
          return { ok: true, text: clamped.slice(0, 4000), chars: clamped.length }
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : 'refresh failed' }
        }
      },
    },
    quoteForSnippet: {
      description:
        'Quote the article VERBATIM (single sentence) around a keyword. Use for a dramatized line or callback so the comic stays faithful to the source.',
      inputSchema: z.object({ keyword: z.string() }),
      execute: async ({ keyword }: { keyword: string }) => {
        return { ok: true, quote: quoteForSnippet(ctx().articleText, keyword) }
      },
    },
    generatePanelArt: {
      description:
        'Request a per-panel comic image from a narrative + genre. Returns an imageUrl; the final panel should reference this.',
      inputSchema: z.object({ narrative: z.string(), genre: z.string() }),
      execute: async ({ narrative, genre }: { narrative: string; genre: string }): Promise<{ ok: boolean; image?: ImageGenerationResult | null; error?: string }> => {
        try {
          const image = await ImageGenerationService.generateNarrativeImage({ narrative, genre })
          return { ok: true, image }
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : 'image generation failed' }
        }
      },
    },
    done: {
      description:
        'Signal the comic panel is complete. Provide the final narrative text (2-3 sentences), and optionally the imagePrompt used. The loop stops when this is called.',
      inputSchema: z.object({
        narrative: z.string().describe('Final 2-3 sentence narrative for this panel.'),
        imagePrompt: z.string().optional().describe('The image-generation prompt used for this panel.'),
      }),
      // No `execute` → calling this naturally terminates the loop.
    },
  }
}

/**
 * Assemble a panel via a ToolLoopAgent that may call refreshArticle,
 * quoteForSnippet, and generatePanelArt before finalizing with `done`.
 *
 * Streaming decision: our routes push raw SSE via a custom ReadableStream, so we
 * run `agent.generate()` (assemble-then-push) and yield the assembled result.
 */
export async function generatePanelAgentic(
  context: PanelAgentContext,
  beat: StoryPlan['arc'][number],
  prompt: string,
  budgetLimit: number = 4000
): Promise<GeneratedPanel> {
  const model = getModel(context.modelLabel || '')
  const budget: AgentBudget = context.budget ?? { maxTokens: budgetLimit, spent: 0 }
  const traces = context.traces ?? []

  const readCtx = () => ({ ...context, budget, traces })

  const agent = new ToolLoopAgent({
    id: 'writersarcade-panel-agent-v1',
    model,
    instructions: [
      'You are the per-panel narrator of an interactive comic. The player is mid-story; keep their POV.',
      `CURRENT BEAT: ${beat.beat} — ${beat.intent}`,
      `MOOD: tension=${beat.mood.tension}, chaos=${beat.mood.chaos}, hope=${beat.mood.hope}`,
      'SCENE FOCUS: ONE scene only. No recap, no flashbacks, no speech-bubble text.',
      'FORMAT: exactly 2-3 sentences, then you may present 4 numbered options (1. 2. 3. 4.) on separate lines.',
      'Keep hidden stakes and the source thesis undramatized in plain text.',
      'Use tools only if helpful: refreshArticle to ground, quoteForSnippet for a verbatim callback, generatePanelArt to request panel art. Then call done() with the final narrative.',
    ].join('\n'),
    tools: buildPanelTools(readCtx),
    stopWhen: isStepCount(8),
  })

  const result = await agent.generate({
    prompt,
    onStepEnd: async (step) => {
      const toolsUsed = (step.toolCalls as Array<{ toolName?: string }> | undefined) ?? []
      const toolNames = toolsUsed.map((t) => t.toolName ?? '').filter(Boolean)
      const usage = step.usage
      if (usage?.totalTokens) budget.spent += usage.totalTokens
      if (toolNames.length) {
        traces.push({
          step: step.stepNumber,
          tool: toolNames.join(','),
          argsHash: argsHash(prompt),
          model: context.modelLabel,
          tokens: usage?.totalTokens ?? 0,
          at: new Date().toISOString(),
        })
      }
    },
  })

  // Assembled narrative + options from the agent's final text.
  const text = result.text ?? ''
  let narrative = text
  const options = text ? parseGameOptions(text) : []
  if (options.length > 0) {
    const firstOption = text.search(/(?:^|\n)\s*1[.)]\s+/)
    if (firstOption !== -1) narrative = text.slice(0, firstOption).trim()
  }

  return { narrative: narrative || beat.intent, options, image: null, traces, budget }
}

/**
 * Streaming-adapter async generator: converts an assembled `GeneratedPanel` into
 * the `GameplayResponse` event shape the `/chat` + `/start` SSE routes expect.
 * Yields content → options → end, persisting the panel narrative into `assistantContent`.
 */
export async function* streamAgenticPanel(panel: GeneratedPanel): AsyncGenerator<GameplayResponse> {
  yield { type: 'content', content: panel.narrative }
  if (panel.options.length) {
    yield { type: 'options', options: panel.options }
  }
  yield { type: 'end' }
}

/** Shared entry: gate + assemble a panel via the agent when the feature is on. */
export async function generateAgenticPanelOrThrow(
  ctx: Omit<PanelAgentContext, 'budget' | 'traces'> & { articleText?: string },
  beat: StoryPlan['arc'][number],
  prompt: string
): Promise<GeneratedPanel> {
  if (!isFeatureEnabled('agentTools')) {
    throw new Error('agentTools disabled')
  }
  const traces: AgentToolTrace[] = []
  const budget: AgentBudget = { maxTokens: 4000, spent: 0 }
  return generatePanelAgentic({ ...ctx, budget, traces }, beat, prompt)
}