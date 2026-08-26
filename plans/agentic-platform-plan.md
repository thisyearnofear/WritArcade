# Making WritersArcade Agentic — AI SDK v7 Foundation

## Decision

Upgrade the Vercel AI SDK from **v4.3.19 → v7 (latest, `^7`)** and build the whole agentic
programme on the v7 agent primitives. Rationale (verified against `node_modules` + ai-sdk.dev):

- v7 ships a first-class **`ToolLoopAgent`** (model + tools + loop control in one object), replacing
  the manual `streamText` + `maxSteps` dance we would otherwise hand-roll on v4.
- **Loop control is now `stopWhen` / `prepareStep`**, with stabilized (non-experimental)
  `activeTools` / `instructions`; v4's `maxSteps`-on-core-functions approach is superseded.
- **Structured output is unified** via `generateText`/`streamText` with `output: Output.object(...)`
  (Zod/Valibot/JSON-schema), composable with tool calls in the same request.
- Provider deps (`@ai-sdk/openai@0.0.x`, `@ai-sdk/anthropic@0.0.x`, `@ai-sdk/google@3.0.x`) are
  early-v4-era and pin us to an old core; they must move in lockstep.

## Current state (verified)

- Calls in prod: `domains/games/services/game-ai.service.ts` (`generateObject` x3, `streamText` x3),
  `app/api/games/epilogue/route.ts` (`generateText`), `lib/basepaint/vision.ts` (`generateText`).
- `lib/ai-model-compatibility.ts` casts every model to `LanguageModelV1` (v4 type) and reaches
  **Venice via `openaiProvider.chat()` on `createOpenAI({ baseURL })`** — Venice tool-calling is
  OpenAI-route-dependent.
- No `.tools()` / toolCall anywhere in prod code. Fastify API (`apps/writersarcade-api`) does not use `ai`.

## Phase 0 — Upgrade to AI SDK v7 (isolated PR, do first)

> **STATUS: implemented & verified locally (type-check ✅, 257 tests ✅, eslint ✅).**
> Actual v7 renames applied (beyond the earlier plan sketch):
> - `system:` → `instructions:` (2 `streamText` sites in `game-ai.service.ts`).
> - `maxTokens` → `maxOutputTokens` (v7 renamed the cap; 2 sites: epilogue, vision).
> - Modal part `{ type: 'image', image, mimeType }` → `{ type: 'file', mediaType, data }` (vision.ts).
> - `LanguageModelV1` → `LanguageModel` type in `lib/ai-model-compatibility.ts`
>   (`createOpenAI().chat()`/`openai()`/`google()`/`anthropic()` all still return a model.
> - **Kept** the 3 existing `generateObject({ schema })` calls unchanged — v7 still exports and fully
>   supports them (schema param intact), so we avoid churning working code; NEW structured calls
>   (Phase 1 plan, Phase 3 critic) will use the modern `output: Output.object(...)`.
> - **Venice tool-call capability check (Phase 0 gate #4): PASSED** — threw a runtime `generateText`
>   with a `tool` against `createOpenAI({ baseURL: api.venice.ai })`, model `llama-3.3-70b`; the model
>   emitted a real `getCasing` tool call (TOOL-CALL-EMITTED true). Agents can route through the
>   Venice default model.
> - Deferred until a `VENICE_API_KEY` is available / approved: the live Venice tool-call capability
>   check (Phase 0 gate #4).

**1. Bump deps** in `package.json`:
```jsonc
"ai": "^7.0.0",
"@ai-sdk/openai": "<latest v7-compatible>",
"@ai-sdk/anthropic": "<latest v7-compatible>",
"@ai-sdk/google": "<latest v7-compatible>"
```
Confirm exact latest with `pnpm view ai version` (and per-provider).

**2. Run the codemod:**
```bash
pnpm install
npx @ai-sdk/codemod v7
# auto renames: system→instructions, experimental_output→output,
# experimental_prepareStep→prepareStep, experimental_activeTools→activeTools, ...
```

**3. Manual migration of the 4 call sites:**
- `game-ai.service.ts`: rename `system:` → `instructions:` on every `streamText`; replace the 3
  `generateObject({ model, schema })` with `generateText({ model, output: Output.object({ schema }) })`
  and read `.output` (unify on v7).
- `lib/ai-model-compatibility.ts`: change `type CompatibleLanguageModel = LanguageModelV1` →
  `LanguageModel` (import from `'ai'`); the wrapper casts become `as LanguageModel`. Keep the Venice
  `createOpenAI({ baseURL })` path exactly as-is (verify it still satisfies the new type).
- `epilogue/route.ts`, `vision.ts`: confirm they still compile (no `system`); they use `generateText`.
- Run `pnpm type-check && pnpm test && npx eslint`. Commit as a pure, isolated upgrade PR BEFORE any
  agent feature work, so regressions surface alone.

**4. Venice tool-calling capability check (blocker gate):**
Script that calls `createOpenAI({ baseURL: venice })` with a `tool` and confirms a *real tool call*
byte is emitted (not just text). If Venice cannot reliably emit tool calls, the agent layer must
route tool-capable calls to Gemini/OpenAI. This is independent of the SDK version.

## Phase 1 — Model-driven story planning (v7 structured output)

> **STATUS: implemented & verified locally (type-check ✅, 260 tests ✅ incl. new schema tests, eslint ✅).**
> - New `domains/games/services/story-planner.service.ts` uses `generateText({ output: Output.object({ schema: storyPlanSchema }) })`.
> - Additive Prisma columns `agentPlan Json?` / `agentTraces Json?` + migration
>   `prisma/migrations/202608260001_add_agent_plan_state/migration.sql` (ALTER TABLE games ADD COLUMN).
> - `Game.agentPlan` threaded through `createGame`, `mapPrismaGameToGame`, and the domain `Game`/`GameGenerationResponse` types.
> - `GameAIService.generateGame` builds the plan (gated on `isFeatureEnabled('agentPlan')`, non-blocking on failure).
> - `getPacingGuidance(currentPanel, maxPanels, plan?)` prefers the storyboard's beat `intent`/`mood`, falling back to the old arc template.
> - `startGame`, `chatGame`, `generatePanelWithModifier` each accept `plan?` and are wired from `start/route.ts` and `chat/route.ts`.
> - Feature flags `agentPlan` / `agentTools` / `agentRefine` added to `lib/config.ts` (default OFF).
> - To enable at runtime: set `FEATURE_AGENT_PLAN=true` in `.env` / `.env.production`, then create a game (persists the plan) and play it (panels consume the plan).

New `domains/games/services/story-planner.service.ts`:
- `generateText({ model, instructions, output: Output.object({ schema: storyPlanSchema }) })`
  → typed `storyPlanSchema` output. One extra call per game at `startGame`.
- Persist to **additive** `Game.agentPlan Json?`; `getPacingGuidance(panel)` becomes `arc[panel-1]`,
  old literal template kept only as the flag-off/absent fallback.
- `mood {tension,chaos,hope}` (−10..10) feeds existing `MoodModifierService` directly.

The `storyPlanSchema` zod shape from the earlier iteration stays as-is; it is simply generated via
`output: Output.object(...)` instead of `generateObject`.

Gate: `isFeatureEnabled('agentPlan')` (add to `lib/config.ts` features + env).

## Phase 2 — Agentic panel loop via `ToolLoopAgent`

> **STATUS: implemented & verified locally (type-check ✅, 262 tests ✅ incl. new adapter test, eslint ✅).**
> - New `domains/games/services/panel-agent.service.ts`:
>   - `generatePanelAgentic(ctx, beat, prompt)` builds a `ToolLoopAgent` (`id: writersarcade-panel-agent-v1`,
>     model from `getModel`, `instructions` = plan beat + mood + invariants, `tools` = refreshArticle /
>     quoteForSnippet / generatePanelArt / done (no execute), `stopWhen: isStepCount(8)`), runs `agent.generate()`,
>     reads `result.text`, parses options, and returns `GeneratedPanel` incl. `traces` + `budget`.
>   - `streamAgenticPanel(panel)` adapts an assembled panel → `GameplayResponse` events (content → options → end).
>   - `generateAgenticPanelOrThrow(...)` gates on `isFeatureEnabled('agentTools')`.
> - Wired into **`app/api/games/chat/route.ts`** and **`app/api/games/[slug]/start/route.ts`**: when
>   `agentTools` on + a plan beat exists, the opening/successive panel routes through the agent; traces are
>   persisted (additive `agentTraces` column). Falls back to the procedural path on any error or flag-off.
> - Streaming decision **(A) assemble-then-push** was chosen (routes are raw SSE, not `useChat`); verified it
>   does not break the existing `for await` stream loop.
> - To enable at runtime: `FEATURE_AGENT_TOOLS=true` (plus `FEATURE_AGENT_PLAN=true` so a plan exists), then play a game.

> _Note: Phase 2 currently takes the agent's final `text` (assemble-then-push), so it does not yet surface
> `image` from `generatePanelArt`; that's a follow-up. Budget is tracked (`spent/maxTokens`) in traces but
> not yet hard-enforced as a StopCondition — see Phase 3._

New `domains/games/services/panel-agent.ts` (original sketch; now ~implemented in `panel-agent.service.ts`):
- `model: getModel()` (v7 `LanguageModel`).
- `instructions:` current plan beat `{intent, dilemmas}` + genre/mood + the invariants the model
  must hold (hidden stakes, brand voice, no-recap per panel).
- `tools:` server-side only, each `tool({ description, inputSchema, execute })`, cost-counted under a
  per-request `agentBudget`:
  - `refreshArticle(prompt)` — `ContentProcessorService.processUrl` (apply `clampCopy` 20k).
  - `quoteForSnippet(keyword)` — verbatim article quote.
  - `generatePanelArt({ narrative, genre, theme })` — `ImageGenerationService.generateNarrativeImage`.
  - `done({ narrative, imagePrompt })` — **no `execute`**; signals natural termination.
- `stopWhen: isStepCount(cap)` + a custom `budgetExceeded` StopCondition (sum `step.usage` vs budget).
- `prepareStep`: shrink `activeTools` to the minimal callable set per step (stabilized).
- Lifecycle `onStepEnd` → debit budget, append `{step, tool, argsHash, model, tokens, at}` to `agentTraces`.
- Final result read from the `done` tool input (or `output`).

**Streaming-to-client decision (confirm in build 1):** our `start`/`chat` routes stream raw SSE
(custom `ReadableStream` + `TextEncoder`), not `useChat`. Options:
- **(A) Assemble then push** — run `panelAgent.generate({ prompt, runtimeContext, toolsContext })`,
  then push the assembled narrative via the existing encoder. Simpler + single agent; loses per-token
  streaming for the parser.
- **(B) Preserve token streaming** — keep the final narrative step as `streamText` in a v7 manual
  agent loop (cookbook `manual-agent-loop`), with `refreshArticle`/`quoteForSnippet` as short pre-steps.
  Keeps streaming UX; a little more hand-rolled.
Choose (A) for correctness first; adopt (B) if streaming latency regresses. **Verify `agent.stream()`
raw-events shape in build 1** before fully committing to (A).

Gate: `isFeatureEnabled('agentTools')` + budget gate; unchanged procedural start/chat path is the default.

## Phase 3 — Verify-and-fix self-reflection (v7 structured critic)

> **STATUS: implemented & verified locally (type-check ✅, 267 tests ✅ incl. new criticschema tests, eslint ✅).**
> - New `domains/games/services/panel-critique.service.ts`:
>   - `panelCritiqueSchema` (zod) → `{ passes, issues[], action: 'keep'|'regenerate'|'revise_image_prompt' }`.
>   - `PanelCritiqueService.critique(input)` uses `generateText({ output: Output.object({ schema }) })`.
>   - `critiqueDirective(critique)` builds the `CRITIQUE: <issues>` string for a regenerate.
>   - `MAX_CRITIQUE_RETRIES = 2`.
> - `panel-agent.service.ts`:
>   - `buildPanelAgent(...)` now hard-enforces the **budget as a `StopCondition`** (`budget.spent >= budget.maxTokens`)
>     alongside `isStepCount(8)` — closing the budget-enforcement gap noted at the end of Phase 2.
>   - `runPanelPass(...)` factors one agent pass.
>   - `generatePanelAgentic(...)` runs the agent, then, when `isFeatureEnabled('agentRefine')`, iterates a
>     critique → regenerate loop capped at `MAX_CRITIQUE_RETRIES`, feeding `critiqueDirective` back into `instructions`.
> - New test `tests/panel-critique.test.ts` (schema parse + directive + retry cap).
> - To enable at runtime: `FEATURE_AGENT_REFINE=true` (with `FEATURE_AGENT_TOOLS=true` + a plan present).
> - Follow-ups (image surfacing, MoodModifier-driven rebuild, refund idempotency) — **implemented**:
>   - `generatePanelArt` now rebuilds the image prompt by appending a `MoodModifierService.getMoodModifiers(mood, genre)`
>     style string (tension/chaos/hope) and surfaces the produced `ImageGenerationResult` via the agent's
>     `toolResults` (read in `runPanelPass`) — returned as `GeneratedPanel.image`.
>   - `refundAgentMediaCharge(charge)` refunds a failed paid panel at most once, idempotency-gated on a new additive
>     `Game.agentMediaRefundedAt DateTime?` column + migration `202608260002_add_agent_media_refund` (conditional `updateMany`,
>     mirrors `video-charge.service.ts`). Privileged in `panel-agent.service.ts` and covered by 3 new unit tests.
> - Remaining (deferred, optional): wiring `mediaCharge` from an actual paid-panel payment source in the routes, and
>   `revise_image_prompt` still normalized to `regenerate`-style.
>
> ### ⚠️ Production finding from the end-to-end smoke test (FIXED)
> - Live smoke test proved **Venice `llama-3.3-70b` does NOT support `response_format` (structured
>   output)** — `Output.object()` / `generateObject` fail against it ("response_format is not supported
>   by this model"), even though Venice *does* support tool-calling (Phase 0 gate passed).
> - Because `getModel('')` defaults to Venice when `VENICE_API_KEY` is set, the **Phase 1 story plan and
>   Phase 3 critique would break in production** whenever Venice is configured.
> - **Fix:** added `getStructuredOutputModel(userPreferences)` in `lib/ai-model-compatibility.ts` that
>   prefers a JSON-mode-capable provider (Gemini → OpenAI) and only falls back to Venice when no other
>   external provider is configured. `StoryPlannerService` and `PanelCritiqueService` now use it. The
>   `ToolLoopAgent` (Phase 2) keeps `getModel()` (Venice tool-calling works).
> - Verified: `pnpm type-check` ✅, `pnpm test` 270 ✅, eslint ✅.

New `domains/games/services/panel-critique.service.ts` (original spec, now implemented):

Gate: `isFeatureEnabled('agentRefine')`.

## Phase 4 — Rollout, safety, verification

- Flags default-off in `lib/config.ts`; enable per-phase in `.env.production` only after review.
- Additive migrations only (`agentPlan`, `agentTraces` as `Json?`); never `db push --accept-data-loss`;
  never retype `credits`/`totalCreditsPurchased`. Sync `CREDITS_CONFIG.cost` + spend zod enum if an
  action becomes chargeable.
- Serverless bounds: one `/start` request must fit the plan + first panel; ≤2 critique retries; long
  work stays on the async video poll pipeline.

**Verification**
1. `pnpm install && pnpm type-check && pnpm test && npx eslint` (add tests under `tests/games/` with
   `vi.doMock`ed providers).
2. `pnpm dev` with `FEATURE_AGENT_PLAN/TOOLS/REFINE=true`; POST `/api/games/[slug]/start`:
   - narrative reaches the client (streamed or assembled);
   - `Game.agentPlan` persists (Phase 1);
   - server logs a **real tool call + tool result**, plus budget/trace rows in `agentTraces` (Phase 2);
   - a deliberately bad panel triggers exactly one regenerate (Phase 3).
3. Negative test: flag off / budget closed ⇒ behavior identical to today, no extra LLM calls, no spend.
4. Venice tool-call check (Phase 0) passes or routes to Gemini.
5. Commit → push `main` → Vercel autodeploy. If schema changed,
   `DATABASE_URL="$(...)" pnpm exec prisma migrate deploy` against Neon (never the VPS DB).
