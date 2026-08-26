import { ToolLoopAgent, isStepCount, type StopCondition } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/ai-model-compatibility'
import { isFeatureEnabled } from '@/lib/config'
import type { StoryPlan } from './story-planner.service'
import { ContentProcessorService } from '@/domains/content/services/content-processor.service'
import { ImageGenerationService, type ImageGenerationResult } from './image-generation.service'
import { clampCopy } from './generation-prompts'
import { PanelCritiqueService, MAX_CRITIQUE_RETRIES, critiqueDirective } from './panel-critique.service'
import { MoodModifierService } from './mood-modifier.service'
import { CREDITS_CONFIG } from '@/lib/writer-coins'
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
  /**
   * Optional paid-media charge for this panel. When present and the panel fails
   * to produce a narrative, the charge is refunded at most once (idempotency-gated
   * on Game.agentMediaRefundedAt). Mirrors the video-charge refund discipline.
   */
  mediaCharge?: {
    paymentRef: string
    cost: number
    userId: string | null
    slug: string
    gameId: string
  }
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

/**
 * Build a full image-generation prompt from narrative + genre + mood style,
 * optionally appending a critique directive. MoodModifierService-steered.
 */
function buildImagePromptFromText(
  narrative: string,
  genre: string,
  beat: StoryPlan['arc'][number],
  directive?: string
): string {
  const mood = beat.mood
  const moodStyle = MoodModifierService.getMoodModifiers(mood, genre)
  const base = `${narrative}. ${moodStyle ? `Style: ${moodStyle}.` : ''}`
  return directive ? `${base} ${directive}` : base
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
        'Request a per-panel comic image from a narrative + genre. Returns an imageUrl. Use it for a beat that needs a strong visual; the final panel should reference this image.',
      inputSchema: z.object({ narrative: z.string(), genre: z.string() }),
      execute: async ({ narrative, genre }: { narrative: string; genre: string }): Promise<{ ok: boolean; image?: ImageGenerationResult | null; error?: string }> => {
        try {
          const c = ctx()
          // MoodModifierService-driven style rebuild from the beat's mood (tension/chaos/hope).
          const beat = c.plan?.arc?.find((b) => b.beat) ?? c.plan?.arc?.[0]
          const mood = beat?.mood ?? { tension: 0, chaos: 0, hope: 0 }
          const moodStyle = MoodModifierService.getMoodModifiers(mood, genre)
          const image = await ImageGenerationService.generateNarrativeImage({
            narrative: `${narrative} ${moodStyle ? `Style: ${moodStyle}.` : ''}`.trim(),
            genre,
          })
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

/** Build the agent once (so the budget + critique directives are captured). */
function buildPanelAgent(
  context: PanelAgentContext,
  beat: StoryPlan['arc'][number],
  extraDirective: string
) {
  const model = getModel(context.modelLabel || '')
  const budget = context.budget
  const traces = context.traces ?? []

  const readCtx = () => ({ ...context, budget, traces })

  const tools = buildPanelTools(readCtx)

  // Phase 3: hard-enforce the budget as a stop condition alongside the step cap.
  const stops: StopCondition<typeof tools>[] = [isStepCount(8)]
  if (budget && budget.maxTokens > 0) {
    stops.push(() => budget.spent >= budget.maxTokens)
  }

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
      extraDirective,
    ]
      .filter(Boolean)
      .join('\n'),
    tools,
    stopWhen: stops,
  })

  return { agent, budget, traces }
}

/** Run one agent pass and collect the assembled narrative/options + panel art. */
async function runPanelPass(
  context: PanelAgentContext,
  beat: StoryPlan['arc'][number],
  prompt: string,
  extraDirective: string
): Promise<{ text: string; image?: ImageGenerationResult | null; budget: AgentBudget; traces: AgentToolTrace[] }> {
  const { agent, budget, traces } = buildPanelAgent(context, beat, extraDirective)
  const result = await agent.generate({
    prompt,
    onStepEnd: async (step) => {
      const toolsUsed = ((step as { toolCalls?: Array<{ toolName?: string }> }).toolCalls as Array<{ toolName?: string }> | undefined) ?? []
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

  // Surface the panel art produced by the generatePanelArt tool, if any.
  let image: ImageGenerationResult | null | undefined
  const toolResults = result.toolResults as Array<{ toolName?: string; result?: unknown }> | undefined
  const art = toolResults?.find((t) => t.toolName === 'generatePanelArt')
  if (art) {
    const r = art.result as { ok?: boolean; image?: ImageGenerationResult | null } | undefined
    if (r?.ok && r.image) image = r.image
  }

  return { text: result.text ?? '', image, budget, traces }
}

/**
 * Assemble a panel via a ToolLoopAgent that may call refreshArticle,
 * quoteForSnippet, and generatePanelArt before finalizing with `done`.
 *
 * Phase 3: when `agentRefine` is enabled, runs a cheap PanelCritiqueService pass
 * and re-runs the agent (capped at MAX_CRITIQUE_RETRIES) with the issues fed back.
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
  const budget: AgentBudget = context.budget ?? { maxTokens: budgetLimit, spent: 0 }
  const traces = context.traces ?? []
  const fullCtx: PanelAgentContext = { ...context, budget, traces }

  let pass = await runPanelPass(fullCtx, beat, prompt, '')

  // Phase 3 verify-and-fix loop.
  if (isFeatureEnabled('agentRefine')) {
    for (let attempt = 0; attempt < MAX_CRITIQUE_RETRIES; attempt++) {
      const critique = await PanelCritiqueService.critique({
        narrative: pass.text,
        imagePrompt: pass.image ? buildImagePromptFromText(pass.text, fullCtx.genre, beat) : undefined,
        genre: fullCtx.genre,
      })

      if (critique.action === 'regenerate') {
        // Re-run the whole agent pass feeding the issues back into instructions.
        pass = await runPanelPass(fullCtx, beat, prompt, critiqueDirective(critique))
        continue
      }

      if (critique.action === 'revise_image_prompt') {
        // Keep the narrative; rebuild + re-generate ONLY the image from the critique issues.
        const revisedPrompt = buildImagePromptFromText(pass.text, fullCtx.genre, beat, critiqueDirective(critique))
        try {
          const newImage = await ImageGenerationService.generateNarrativeImage({
            narrative: revisedPrompt,
            genre: fullCtx.genre,
          })
          pass = { ...pass, image: newImage }
        } catch (e) {
          console.error('revise_image_prompt image regen failed (keeping prior art):', e)
        }
        continue
      }

      // action === 'keep' → accept.
      break
    }
  }

  const text = pass.text
  let narrative = text
  const options = text ? parseGameOptions(text) : []
  if (options.length > 0) {
    const firstOption = text.search(/(?:^|\n)\s*1[.)]\s+/)
    if (firstOption !== -1) narrative = text.slice(0, firstOption).trim()
  }
  const image = pass.image ?? null

  // Follow-up: refund idempotency. If a paid panel produced no narrative (total
  // failure after retries), refund the media charge at most once.
  if (!narrative && fullCtx.mediaCharge) {
    await refundAgentMediaCharge(fullCtx.mediaCharge)
  }

  return { narrative: narrative || beat.intent, options, image, traces: fullCtx.traces, budget: fullCtx.budget }
}

/**
 * Charge for an agent-generated panel via an atomic credit spend (mirrors the
 * `/api/credits/spend` discipline: decrement iff gte cost, record a CreditTransaction
 * and a verified Payment row keyed by a sentinel hash). Returns the `mediaCharge` the
 * panel agent threads through for fail-refunds, or null if it cannot charge.
 *
 * No-op (returns null) unless `FEATURE_AGENT_PAID_PANELS` is enabled, so the free
 * path stays unchanged until the platform opts paid panels in.
 */
export async function chargeAgentPanel(params: {
  userId: string | null
  gameId: string
  slug: string
}): Promise<NonNullable<PanelAgentContext['mediaCharge']> | null> {
  if (!params.userId) return null
  if (process.env.FEATURE_AGENT_PAID_PANELS !== 'true') return null

  const cost = CREDITS_CONFIG.cost['agent-panel']
  const { randomBytes } = await import('node:crypto')
  const { prisma } = await import('@/lib/prisma')
  const sentinelHash = `credits:${randomBytes(16).toString('hex')}`

  try {
    const ok = await prisma.$transaction(async (tx) => {
      const reserved = await tx.user.updateMany({
        where: { id: params.userId as string, credits: { gte: cost } },
        data: { credits: { decrement: cost } },
      })
      if (reserved.count === 0) return false
      await tx.creditTransaction.create({
        data: {
          userId: params.userId as string,
          fiatAmount: 0,
          creditAmount: -cost,
          status: 'completed',
          completedAt: new Date(),
        },
      })
      await tx.payment.create({
        data: {
          transactionHash: sentinelHash,
          action: 'agent-panel',
          amount: cost,
          status: 'verified',
          verifiedAt: new Date(),
          writerCoinId: 'credits',
          userId: params.userId as string,
        },
      })
      return true
    })
    if (!ok) return null
    return { paymentRef: sentinelHash, cost, userId: params.userId as string, slug: params.slug, gameId: params.gameId }
  } catch (e) {
    console.error('Agent panel charge failed:', e)
    return null
  }
}

/**
 * At-most-once refund of a paid panel media charge. Idempotency is gated on the
 * additive `Game.agentMediaRefundedAt` marker (conditional updateMany), mirroring
 * the video-charge refund discipline. Fails safe (returns false) on missing ref/user.
 * Exported for unit testing.
 */
export async function refundAgentMediaCharge(charge: {
  paymentRef: string
  cost: number
  userId: string | null
  slug: string
  gameId?: string
}): Promise<boolean> {
  if (!charge.userId || !charge.paymentRef) return false
  const { prisma } = await import('@/lib/prisma')
  try {
    return await prisma.$transaction(async (tx) => {
      const marked = await tx.game.updateMany({
        where: {
          id: charge.gameId ?? undefined as string | undefined,
          agentMediaRefundedAt: null,
        },
        data: { agentMediaRefundedAt: new Date() },
      })
      if (marked.count !== 1) return false
      await tx.user.update({
        where: { id: charge.userId as string },
        data: { credits: { increment: charge.cost } },
      })
      await tx.creditTransaction.create({
        data: {
          userId: charge.userId as string,
          fiatAmount: 0,
          creditAmount: charge.cost,
          status: 'refunded',
          completedAt: new Date(),
          metadata: { reason: 'agent-panel-media-failure', slug: charge.slug },
        },
      })
      return true
    })
  } catch (e) {
    console.error('Agent media refund failed:', e)
    return false
  }
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