# 8.5/10 Roadmap: From Feature-Bloated Hackathon Project to Polished Product

> **Guiding Principle:** Every task below follows our Core Principles in priority order:
> ENHANCEMENT FIRST → CONSOLIDATION → PREVENT BLOAT → DRY → CLEAN → MODULAR → PERFORMANT → ORGANIZED

---

## 1. Product Design — 8/10 → 8.5/10

### Problem: Feature bloat from 4+ hackathons creates a scattered surface area. The core value prop ("article → playable, mintable game") is excellent but diluted.

| # | Task | Core Principle | Effort | Impact |
|---|---|---|---|---|
| ✅ 1.1 | **Audit and archive non-core features behind feature flags.** Create a single `config.features` map in `lib/config.ts` that toggles: `assetMarketplace`, `hypercerts`, `litProtocol` (legacy), `superrare`, `etherfuse`, `videoPipeline`. Default everything **off** except the core flow: Quick Games + IP Registration + CDR Vaults. DONE — `config.features` map exists; `litProtocol` toggle removed from `config.ts`. | PREVENT BLOAT | 2h | ★★★★★ |
| ✅ 1.2 | **Resolve overlapping solutions.** CDR vaults have superseded Lit Protocol for secret panels. DONE — `@lit-protocol/*` fully removed from source and lockfile; legacy decryption is CDR-only (`wordleAnswerVaultUuid` fallback retained for pre-Inco games). | CONSOLIDATION / ENHANCEMENT FIRST | 4h | ★★★★☆ |
| 1.3 | **Same treatment for Plaintext vs. Vaulted Wordle answers.** Pick one path (CDR vaults, since you already built that infrastructure) and remove the plaintext fallback. This simplifies the Wordle flow and removes a security ambiguity. | CONSOLIDATION | 2h | ★★★☆☆ |
| 1.4 | **Define the "top-3 feature set" explicitly** in `docs/PRODUCT_CHART.md` — core, secondary, and experimental tiers. Only the core tier gets marketing/UI prominence. Secondary features get smaller entry points. Experimental features are flag-gated. | PREVENT BLOAT | 1h | ★★★★☆ |
| 1.5 | **Write a coherent product narrative** for the landing page and onboarding that sells ONE story: "Paste an article, get an interactive comic game you own." Strip references to marketplace, Etherfuse, SuperRare, etc. from the hero section; relegate them to a secondary "also available" footer. | CLEAN | 2h | ★★★★☆ |
| 1.6 | **Delete the Asset Marketplace domain** (`domains/assets/*`) if it's not actively used, or consolidate it into `domains/games` as a single "compose from existing" feature. Remove orphaned assets routes from `app/api/assets/*`. | CONSOLIDATION | 3h | ★★★★☆ |

**Score target: 8.5/10** — Single coherent product narrative, no overlapping solutions, archived experimental features still accessible but not distracting.

---

## 2. UI/UX — 8.5/10 → 8.5/10 (Maintain)

### Problem: Already strong. Maintain bar while adding missing loading/error states.

> **Note:** This is already at 8.5. The tasks below are **maintenance**, not improvement.

| # | Task | Core Principle | Effort | Impact |
|---|---|---|---|---|
| 2.1 | **Add `loading.tsx` and `error.tsx` boundary files** at key route segments: `app/games/`, `app/my-games/`, `app/profile/`. Currently these are missing; without them, route-level errors surface as white screens. Use the existing `SkeletonShimmer` component pattern. | PERFORMANT | 2h | ★★★★★ |
| 2.2 | **Audit all API-requesting components for loading/error/empty states.** Check `game-play-interface.tsx`, `game-generator-form.tsx`, `PaymentFlow.tsx`, `comic-book-finale.tsx`, `hero-screen.tsx`. Each component that fetches data should render a skeleton state while loading and an inline error card (use `ErrorCard`) on failure. | PERFORMANT | 3h | ★★★★★ |
| 2.3 | **Add a global toast system.** The `use-toast-notification.ts` hook exists but isn't used consistently. Replace all inline `setTimeout`/"Please wait" patterns with toast notifications for payment success/failure, mint confirmation, IP registration status. | CLEAN | 3h | ★★★★☆ |
| 2.4 | **Verify and fix reduced-motion support.** The reduced-motion checks exist but verify every `motion.div` actually respects them (some may have been added without the check). Add a CSS `@media (prefers-reduced-motion)` override as a safety net. | ENHANCEMENT FIRST | 1h | ★★★☆☆ |

**Score target: 8.5/10** — Maintain the existing high bar. No regressions, just consistency and missing states.

---

## 3. System Architecture — 7.5/10 → 8.5/10

### Problem: Domain boundaries are inconsistent, multiple caching implementations exist, no DI pattern, unused exports create surface area noise.

| # | Task | Core Principle | Effort | Impact |
|---|---|---|---|---|
| 3.1 | **Consolidate all caching into one service.** Currently: `lib/cache.ts`, `__splitCache` in `lib/contracts.ts`, per-class maps in `writer-coin-balance.service.ts`, `asset-marketplace.service.ts`, `image-generation.service.ts`, `voice-narration.service.ts`. Create `lib/cache/` with: `memory-cache.ts` (TTL-based), `cache-manager.ts` (composable with fallback), `cache-stats.ts` (monitoring). Replace all ad-hoc caches with the unified service. | DRY / MODULAR | 4h | ★★★★★ |
| 3.2 | **Clean up `lib/` — split into `lib/` (cross-cutting infrastructure) and `services/` (domain services).** Currently `lib/` is a dumping ground with 34 files mixing infrastructure (`cache.ts`, `config.ts`, `rate-limit.ts`) with domain services (`writerCoins.ts`, `farcaster.ts`, `auth.ts`, `paragraph.ts`). Rule: `lib/` = framework-agnostic utilities; domain logic goes in `domains/*/services/` or `services/`. | ORGANIZED / DRY | 3h | ★★★★☆ |
| 3.3 | **Introduce dependency injection for payment strategies.** Currently `PaymentFlow.tsx` directly imports and instantiates strategies. Create a `PaymentStrategyFactory` that accepts strategies via constructor/config. This makes the payment domain independently testable and replaceable. | MODULAR / CLEAN | 4h | ★★★★☆ |
| 3.4 | **Prune all unused exports.** Run `ts-prune` (or a manual audit of the 30 remaining `eslint-disable-next-line @typescript-eslint/no-unused-vars` warnings) to identify and remove dead code. Pay special attention to `lib/`, `domains/*/services/`, and `hooks/`. | CLEAN / CONSOLIDATION | 2h | ★★★☆☆ |
| 3.5 | **Eliminate the wallet abstraction leak.** `lib/wallet/index.ts` has both `BrowserWallet` and `FarcasterWallet` but the hook layer often bypasses it (e.g., components calling `useAccount()` from wagmi directly). Either commit fully to the abstraction or remove it. Pick one: if Farcaster is strategic, keep the abstraction and migrate all wallet access through it. | CLEAN / MODULAR | 3h | ★★★★☆ |
| 3.6 | **Standardize API route patterns.** Currently some routes use `try/catch → NextResponse.json({success, data})`, others use `NextResponse.json({error})`, others throw. Create a utility `apiResponse.ts` with `ok(data)`, `fail(error, status)`, `paginated(items, total)` and migrate all 40+ route handlers. | DRY / CLEAN | 3h | ★★★☆☆ |
| 3.7 | **Reorganize `domains/games/components/screens/`.** Currently screens are flat next to other components. Create `screens/` subfolder per screen (e.g., `screens/hero-screen/`) with its own components inline, and extract truly shared components up. Rule: if a component is used by only one screen, it lives in that screen's folder. | ORGANIZED / MODULAR | 3h | ★★★☆☆ |

**Score target: 8.5/10** — Clean domain boundaries, single caching service, no dead exports, consistent API patterns, organized file structure.

---

## 4. Intuitiveness/Cogency — 6.5/10 → 8.5/10

### Problem: High Web3 complexity with no progressive onboarding. Users see wallet connectors, chain selectors, and token choices before understanding the value proposition.

| # | Task | Core Principle | Effort | Impact |
|---|---|---|---|---|
| 4.1 | **Redesign the entry flow as progressive disclosure.** First visit: show just a URL input + "Generate free game" CTA. After game generation: show the comic, then a single "Play for free" button (Wordle) or "Mint & Own" upsell. Wallet connection only appears when the user takes an on-chain action (mint, IP registration). Eliminate the wallet wall. | ENHANCEMENT FIRST | 6h | ★★★★★ |
| 4.2 | **Simplify the payment selector UX.** Currently `PaymentFlow.tsx` exposes: token selector, chain selector, writer coin selector, cost breakdown — all at once. Merge into a single "Pay with" dropdown that offers 2-3 clear options. Auto-detect the cheapest path and show it selected with a label like "Best price: X on Y chain". | ENHANCEMENT FIRST / CLEAN | 4h | ★★★★★ |
| 4.3 | **Add contextual micro-copy throughout the Web3 flow.** Every on-chain action should answer: "What is this?" and "Why should I do this?" in one sentence. Examples: "Mint this as an NFT on Base — you'll own the game forever" (before mint), "Register as IP — earn royalties when others remix your game" (before registration). | ENHANCEMENT FIRST | 3h | ★★★★☆ |
| 4.4 | **Hide chain/network complexity entirely.** The frontend should auto-detect and switch chains. Remove chain-selector UIs from the payment flow. If the user is on the wrong chain, show a one-click "Switch network" button (which already exists in parts of the code) — never a cryptic chain name dropdown. | ENHANCEMENT FIRST | 3h | ★★★★☆ |
| 4.5 | **Unify the free vs. paid tiers in a single "Play" button.** Currently there are separate paths for Quick Games (Wordle = free, Story = paid). Make it one CTA: "Play the Comic" (always free to read), with optional "Mint NFT" and "Unlock Secret Panel" as post-play actions. The cost and chain choice only surface when the user opts into on-chain actions. | ENHANCEMENT FIRST / CLEAN | 4h | ★★★★★ |
| 4.6 | **Add a guided onboarding tour** that triggers on first visit (the `OnboardingModal` already exists — integrate it into the flow properly). Connect it to localStorage so returning users skip it. Add a "Help, what is this?" question mark button in the header that re-opens the tour. | ENHANCEMENT FIRST | 2h | ★★★★☆ |
| 4.7 | **Add a "just paste and play" demo mode.** Allow users to generate and read an entire comic without connecting a wallet, selecting a chain, or making any payment. After reading, show a gentle upsell: "Want to own it? Connect wallet to mint." Reduce friction from 5 decisions to 1 decision (paste URL). | ENHANCEMENT FIRST | 5h | ★★★★★ |

**Score target: 8.5/10** — Users can paste a URL and read a comic without any Web3 interaction. Wallet/chain/token decisions only appear when the user voluntarily steps into on-chain ownership.

---

## 5. Reliability/Performance — 6.5/10 → 8.5/10

### Problem: Zero tests on payment flows, no caching layer for expensive AI calls, no error monitoring, bundle > 2.4MB.

| # | Task | Core Principle | Effort | Impact |
|---|---|---|---|---|
| 5.1 | **Write tests for payment flows.** This is where real money moves. Add test coverage for: `PaymentCostService.distribute()` (3 revenue split scenarios), `writer-coin.strategy.ts` (handlePayment/handleVerification), `musd.strategy.ts` (handlePayment/handleVerification), `PaymentFlow.tsx` (state transitions, error handling, network switching). Target: 80%+ coverage on `domains/payments/`. | MODULAR / PERFORMANT | 8h | ★★★★★ |
| 5.2 | **Add integration tests for the critical API routes.** `POST /api/games/generate`, `POST /api/games/chat`, `POST /api/games/mint`, `POST /api/payments/initiate`, `POST /api/payments/verify`. These are the money-moving endpoints. Use Vitest + mocked Prisma (pattern already established in `tests/play-count.test.ts`). | MODULAR | 6h | ★★★★★ |
| 5.3 | **Add a caching layer for expensive API operations.** `POST /api/games/generate` calls AI models (OpenAI/Anthropic) — each call costs money and takes 10-30s. Add request-deduplication (if two identical requests arrive within 5s, return the same in-flight promise) and result-caching (same article URL + genre + difficulty = cached result for 24h). Apply to image generation too. | PERFORMANT | 6h | ★★★★★ |
| 5.4 | **Add Sentry/Rollbar error monitoring.** The `lib/error-handler.ts` is excellent for user-facing messages but errors are only logged to console. Add `@sentry/nextjs` (or `rollbar` if lighter weight desired). Capture: unhandled promise rejections, API route errors, wallet transaction failures, payment verification timeouts. | PERFORMANT | 3h | ★★★★★ |
| 5.5 | **Optimize the bundle.** The largest chunk is 2.4MB (likely `@rainbow-me/rainbowkit` + `wagmi` + `viem` + `@story-protocol/core-sdk`). Dynamic-import heavy SDKs: `@story-protocol/core-sdk` (only needed when user clicks IP registration), `@piplabs/cdr-sdk` (only needed for secret panel unlock). Use `next/dynamic` with `ssr: false` for wallet-dependent components. (`@lit-protocol/*` no longer in the dependency graph.) | PERFORMANT / MODULAR | 4h | ★★★★☆ |
| 5.6 | **Add request deduplication to API routes.** Many routes call the same Prisma queries or blockchain RPCs for the same data within the same request. Add a `deduplicate<T>(key: string, fn: () => Promise<T>)` utility that returns the same promise for concurrent calls with the same key. | DRY / PERFORMANT | 2h | ★★★☆☆ |
| 5.7 | **Add P95 latency monitoring for API routes.** Wrap each route handler with timing middleware that logs p50/p95/p99. Use this data to identify slow routes (likely image generation, AI chat, blockchain RPC calls). Add targeted optimizations where p95 > 5s. | PERFORMANT | 2h | ★★★☆☆ |
| 5.8 | **Integrate tests into CI.** Add a `.github/workflows/ci.yml` (or add to existing) that runs: `pnpm type-check`, `pnpm lint`, `pnpm test` on every push to `main`. This is the single highest-ROI reliability improvement. | MODULAR | 1h | ★★★★★ |

**Score target: 8.5/10** — Payment flows tested, AI operations cached, errors captured in Sentry, bundle < 1.5MB, CI gate prevents regressions.

---

## Implementation Sequence (Recommended Order)

The plan is split into 4 phases. Each phase is roughly one week of focused work.

### Phase 1 — Foundation (Weeks 1-2)

Focus on **reliability** (the weakest dimension) while doing **consolidation** clean-up.

1. **5.1** — Payment flow tests (highest risk area)
2. **3.4** — Prune dead exports and unused code
3. **5.4** — Sentry error monitoring
4. **5.8** — GitHub CI with type-check + lint + test
5. **3.1** — Consolidate caching into one service
6. **1.1** — Feature flag audit, disable non-core features

**Result:** Payment flows have test coverage, errors are monitored, CI catches regressions, dead code removed, feature set consolidated.

### Phase 2 — Architecture (Weeks 3-4)

Focus on **system architecture** cleanup.

1. **3.2** — Reorganize `lib/` vs `services/` split
2. **3.3** — DI for payment strategies
3. **3.5** — Wallet abstraction decision (keep or remove)
4. **3.6** — Standardize API route response patterns
5. **3.7** — Reorganize game components into screen-scoped folders
6. ✅ **1.2** — Remove Lit Protocol, finalize CDR-only (done)

**Result:** Clean architecture, no overlapping solutions, consistent patterns.

### Phase 3 — UX & Product (Weeks 5-6)

Focus on **intuitiveness** and **product design**.

1. **4.1** — Progressive disclosure entry flow (no wallet wall)
2. **4.5** — Unified "Play" button (free read first, upsell after)
3. **4.2** — Simplified payment selector
4. **4.7** — Demo mode (no wallet, no payment, no chain)
5. **4.3** — Contextual micro-copy for Web3 actions
6. **4.4** — Hide chain complexity (auto-switch)
7. **4.6** — Onboarding tour integration
8. **1.4-1.6** — Product chart, narrative, marketplace consolidation

**Result:** First-time users can paste a URL and play in 2 clicks. Web3 complexity surfaces only when needed.

### Phase 4 — Polish (Week 7)

Focus on **performance** and **UI maintenance**.

1. **5.5** — Bundle optimization (dynamic imports)
2. **5.3** — AI request caching + deduplication
3. **5.6** — API route deduplication
4. **2.1** — `loading.tsx` + `error.tsx` boundaries
5. **2.2** — Component-level loading/error/empty states
6. **2.3** — Toast notification system
7. **5.7** — P95 latency monitoring

**Result:** Fast loads, cached AI calls, graceful loading states, performance monitored.

---

## Effort Summary

| Dimension | Current | Target | Phase | Est. Effort |
|---|---|---|---|---|
| Product Design | 8.0 | 8.5 | P1+P3 | 12h |
| UI/UX | 8.5 | 8.5 | P4 | 9h |
| System Architecture | 7.5 | 8.5 | P1+P2 | 19h |
| Intuitiveness/Cogency | 6.5 | 8.5 | P3 | 27h |
| Reliability/Performance | 6.5 | 8.5 | P1+P4 | 32h |
| **Total** | | | **4 phases** | **~99h / ~7 weeks** |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Removing Lit Protocol breaks legacy games | Medium | Keep the decryption path behind a feature flag during transition, verify against known legacy games |
| Consolidating caching introduces regressions | Medium | Add tests first (5.1), then refactor (3.1) — tests validate no behavior change |
| Payment flow tests miss edge cases | Low | Pair with existing test pattern (play-count.test.ts) and add fuzz testing for contract address edge cases |
| Progressive disclosure reduces conversion | Low | A/B test with an optional "advanced mode" toggle for power users |
| Bundle optimization breaks dynamic imports | Low | Use `next/dynamic` patterns already used elsewhere; test with `next build` before merging |
