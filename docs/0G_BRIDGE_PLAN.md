# 0G Bridge Buildathon — Implementation Plan

**Status**: Exploration / Pre-commitment  
**Buildathon**: 0G Bridge by AKINDO — 10 weeks, 5 Waves, up to $50K in 0G Credits  
**Demo Day**: Token2049 Singapore (October 7–8, 2026)  
**Stance**: Supplement, not replace. No existing infra changes without separate rationale.

---

## Why 0G

WritersArcade is already an AI × Onchain application — the exact intersection 0G targets. 0G offers:

- **$50K in infrastructure credits** usable across Compute (GPU inference) and Storage
- **Structured 10-week roadmap** with bi-weekly evaluation — a forcing function for disciplined execution
- **Investment pipeline** — Top performers get introduced to 0G's Investment Committee and Deal Room
- **Token2049 Demo Day** — Platform to present to the broader Web3/AI ecosystem

The goal is to **supplement** the existing product with new output formats that drive user acquisition and deepen the AI × Onchain story, not to migrate or replace anything that works.

---

## Principles Alignment

This plan is shaped by WritersArcade's core principles. Every decision is weighed against them.

### Enhancement First

**Principle**: Always prioritize enhancing existing components over creating new ones.

**Application**: Video clips are a **new output format** for the existing article-to-pipeline, not a new product. The same AI extraction, character definitions, narrative beats, and image generation feed into both formats. The generation flow gains an optional `outputFormat` parameter (`game | video | both`) rather than a parallel codebase.

Existing services that feed video with no modification:
- `domains/content/` — article fetching, cleaning, processing
- `domains/games/services/game-ai.service.ts` — narrative generation, character extraction, asset decomposition
- `domains/media/services/image-generation.service.ts` — frame image generation
- `domains/media/services/audio-generation.service.ts` — ElevenLabs voiceover for narration track

**What's actually new**: A video renderer that composes these existing outputs into a timeline.

### Consolidation

**Principle**: Delete unnecessary code rather than deprecating.

**Application**: Before adding video generation, survey the existing codebase for what becomes redundant:

- **Lit Protocol secret panels** — Already removed: no `@lit-protocol/*` dependencies remain in source, `lib/config.ts`, or the lockfile. CDR vaults and Inco cover the secret-panel flow, with a legacy CDR fallback retained for pre-Inco games.
- **Narrative Preview Modal** — If the video trailer serves as the preview (more engaging than a text modal), the modal component and its API dependency can be removed.
- **Image gen providers that fail silently** — The fallback chain has accumulated providers over time. Audit which are actually serving traffic vs. wasting retry cycles.

**Gate**: Before any video work begins, identify and remove dead code. The net change (code removed + code added) should be close to zero.

### Prevent Bloat

**Principle**: Systematically audit and consolidate before adding new features.

**Application**: The video feature is a natural extension, but it must pass a bloat gate:

1. Does this duplicate any existing API or service? (Check: `domains/media/`, `domains/games/services/`, `apps/writersarcade-api/`)
2. Can we ship the video MVP using only existing AI providers, or do we need new ones?
3. Does the video pipeline add new database tables or just new columns on existing ones?
4. Is there a dependency we'd be adding that only serves video? (e.g., a new video processing library — evaluate whether ffmpeg.wasm or the Hetzner backend can handle it)

**Default answer**: If it adds more weight than value in the first Wave, defer to Wave 3+.

### DRY

**Principle**: Single source of truth for all shared logic.

**Application**: The video pipeline must not duplicate any existing service:

- **Article processing** → `domains/content/` (already shared)
- **Character/asset definitions** → `domains/assets/` types (already shared)
- **Narrative structure** → `domains/games/types.ts` game state schema (reuse, not redefine)
- **Audio narration** → `domains/media/services/audio-generation.service.ts` (not reimplemented inside the video service)
- **Image generation** → `domains/games/services/image-generation.service.ts` (not duplicated)

**Anti-pattern**: Don't create `VideoArticleProcessor` that mirrors `ContentProcessorService`. The video service imports and composes.

### CLEAN

**Principle**: Clear separation of concerns with explicit dependencies.

**Application**: A new `domains/video/` module, isolated from `domains/games/`:

```
domains/video/
  services/
    video-generation.service.ts   # Orchestrates the pipeline
    video-renderer.service.ts     # Composes frames + audio → video file
    video-storage.service.ts      # Upload to 0G Storage / CDN
  types.ts                        # Video-specific types (scene timeline, transitions, etc.)
  utils/
    scene-timeline.ts             # Maps narrative beats → timed scenes
    transitions.ts                # Transition definitions between scenes
```

`VideoGenerationService` explicitly imports from `domains/games` and `domains/content` — no hidden coupling. The game generation service and video generation service are siblings, not one calling the other.

### MODULAR

**Principle**: Composable, testable, independent modules.

**Application**: Output format as a Strategy Pattern, mirroring `domains/payments/strategies/`:

```typescript
interface GenerationStrategy {
  generate(request: GenerationRequest): Promise<GenerationResponse>
  getCost(request: GenerationRequest): number
  getFormat(): OutputFormat
}

// Implementations
class GameGenerationStrategy implements GenerationStrategy { ... }
class VideoGenerationStrategy implements GenerationStrategy { ... }
class AudioOnlyStrategy implements GenerationStrategy { ... }
```

This makes adding future output formats (interactive audio, mixed media, etc.) a matter of adding a new strategy class. Each strategy is independently testable — mock the AI services, test the rendering/composition logic.

### PERFORMANT

**Principle**: Adaptive loading, caching, and resource optimization.

**Application**: Video rendering is the heaviest operation on the platform. Done wrong, it blocks the user and costs money. Done right, it forces good architectural decisions:

- **Async generation** — Video cannot be synchronous. Use the existing Hetzner backend (`apps/writersarcade-api/`) with a job queue (BullMQ) for video rendering. API immediately returns a `jobId`, client polls for completion.
- **0G Storage** — Rendered videos stored on 0G Storage, served via CDN. Avoids storing large video files in PostgreSQL or on Vercel's ephemeral filesystem.
- **Adaptive quality** — Generate multiple quality tiers (720p / 480p / 30s preview) based on user's connection or intent. Short shareable clip renders fast, full trailer renders in background.
- **Caching** — Videos keyed by article URL + parameters. Identical requests served from cache.
- **Background enrichment** — Following existing pattern from `enrichGameInBackground()`: video generation is triggered after the user receives immediate output (game or link), rendering happens async.

### ORGANIZED

**Principle**: Predictable file structure with domain-driven design.

**Application**: Follows the same conventions as every other domain:

```
domains/video/                          # Bounded context
  services/video-generation.service.ts   # Orchestration
  services/video-renderer.service.ts     # Scene composition + encoding
  services/video-storage.service.ts      # 0G Storage upload
  types.ts                               # Scene, Timeline, VideoConfig
  utils/scene-timeline.ts                # Beat → scene mapping
  utils/transitions.ts                   # Transition definitions

app/api/video/
  route.ts                               # POST — trigger generation returns jobId
  [id]/status.ts                         # GET — poll job status
  [id]/download.ts                       # GET — redirect to CDN URL

components/video/                        # UI components
  VideoPlayer.tsx
  VideoGenerationStatus.tsx
  VideoShareButton.tsx

hooks/useVideoGeneration.ts              # React hook for the flow
```

API route pattern matches existing `app/api/games/`. Component location follows existing `components/` convention with subfolder per domain.

---

## Proposed Architecture

### Existing Pipeline (unchanged)

```
Article URL
  → ContentProcessorService (domains/content/)
  → GameAIService (domains/games/) — extracts characters, narrative, mechanics
  → ImageGenerationService (domains/games/) — generates panel images
  → GamePlayer (interactive 5-panel game)
  → NFT Minting
  → CDR Vaulting (secret panels)
```

### Video Addition (new path, same input)

```
Article URL
  → ContentProcessorService (domains/content/) — REUSED
  → GameAIService (domains/games/) — REUSED for narrative/character extraction
  → ImageGenerationService (domains/games/) — REUSED for scene frames
  → AudioGenerationService (domains/media/) — REUSED for voiceover
  → VideoGenerationService (domains/video/) — NEW
      ├─ SceneTimeline — maps story beats to timed scenes w/ transitions
      ├─ VideoRenderer — composes frames + audio into video file
      │   ├─ 30s vertical clip (fast, 2-3 key scenes, text overlays, music)
      │   └─ 60-90s trailer (full narrative, voiceover, transitions, title card)
      └─ VideoStorage — uploads to 0G Storage, returns CDN URL
  → Video Player + Share buttons
```

### Output Format Co-Equal

At generation time, user chooses:
- **Game** (existing interactive 5-panel) — stays primary for engagement and NFT minting
- **Video** (shareable clip/trailer) — for social virality and user acquisition
- **Both** (generate game + auto-produce shareable video) — single generation cost, two outputs

The generation cost model should reflect this: video is more expensive (compute + storage) so "Both" costs more, but less than game + video independently since article processing and AI narrative extraction are shared.

### Two Video Tiers

| Tier | Length | Use | Frequency | Cost Target |
|------|--------|-----|-----------|-------------|
| **Clip** | ~30s vertical | Social sharing (Farcaster, X, TikTok) | Every generation | Low (2-3 key scenes, no voiceover, auto-music) |
| **Trailer** | 60-90s landscape | Game detail pages, embed | On demand or for featured games | Higher (full scenes, voiceover, transitions, title card) |

---

## 0G Infrastructure Integration (Non-Replacement)

| 0G Component | Integration | Existing Alternative | Rationale |
|-------------|-------------|---------------------|-----------|
| **0G Storage** | Store rendered videos + scene assets | Pinata / Grove (IPFS) | IPFS unsuitable for large video files. 0G Storage designed for petabyte-scale. Use for video hosting only — keep game metadata on IPFS. |
| **0G Compute** | GPU-accelerated video rendering | Hetzner backend / Modal | If rendering demand grows, 0G Compute provides decentralized GPU. Start on Hetzner, evaluate in Wave 3-4. |
| **0G Chain** | Not integrated (Wave 1-2) | Base mainnet | No current need. Revisit if 0G Pay or Agentic ID warrants on-chain activity on 0G. |
| **0G Pay** | Not integrated (pending scope) | WriterCoinPayment / MUSD | Potential Wave 4-5 addition: accept 0G Pay as a payment rail for premium video generation. |
| **Agentic ID (ERC-7857)** | Not integrated (pending scope) | ERC-721 GameNFT | Future: tokenize game-agent configurations as portable on-chain agents. Separate proposal. |

**Rule**: No existing integration is replaced unless it independently makes sense (e.g., Pinata costs exceed 0G Storage costs with no quality loss). The 0G integrations are additive.

---

## Wave-by-Wave Milestones

### Wave 1 (June 13–26) — Scoping & Plan
**Goal**: Define project, target 0G components, architecture  
**Credits**: $5,000

- [x] Audit existing codebase for consolidation opportunities (Lit Protocol removal — done, dead image providers, redundant modals)
- [ ] Finalize video generation architecture (this doc → detailed spec)
- [ ] Evaluate 0G Storage SDK for video file hosting
- [ ] Define scene timeline format (how narrative beats map to timed scenes)
- [ ] Establish success metrics for Wave 2 prototype
- [ ] Submit: Architecture doc + consolidation audit + integration plan

**Principles check**: All scoping, no code. Bloat gate passed first.

### Wave 2 (June 27–July 10) — Prototype
**Goal**: Working prototype on 0G testnet with video walkthrough  
**Credits**: $7,500

- [ ] Implement `domains/video/` module skeleton (types, interfaces, strategy pattern)
- [ ] Implement scene timeline utility — map GameAIService output to timed scenes
- [ ] Implement 30s clip renderer (static frames + transition + auto-music) using existing image gen + audio services
- [ ] Implement `POST /api/video/generate` — triggers generation, returns jobId + status URL
- [ ] Implement `GET /api/video/[id]/status` — poll for completion
- [ ] Integrate 0G Storage for video output (upload rendered clips, return CDN URL)
- [ ] Build `<VideoPlayer />` and `<VideoShareButton />` components
- [ ] Demo video walkthrough of the full flow

**Principles check**: Video module is clean/separate from games. DRY — all AI services reused. Video strategy added to strategy pattern.

### Wave 3 (July 11–24) — Mainnet Deployment
**Goal**: Ship to 0G mainnet with verified contract addresses  
**Credits**: $15,000

- [ ] Implement full 60-90s trailer renderer with ElevenLabs voiceover narration
- [ ] Implement adaptive quality tiers (clip/trailer at multiple resolutions)
- [ ] Add video generation option to main generation UI (co-equal format toggle)
- [ ] Implement cache layer (keyed by article URL + generation params)
- [ ] Deploy video generation to Hetzner backend with job queue
- [ ] Set up 0G Storage production integration for video hosting
- [ ] End-to-end testing: article → clip → share

**Principles check**: Performance — async rendering, caching, adaptive quality. Backend job queue existing pattern.

### Wave 4 (July 25–August 7) — User Acquisition
**Goal**: Real users, real usage, real signal  
**Credits**: $10,000

- [ ] Social sharing integrations (Farcaster cast with embedded video, X/Twitter card, TikTok export)
- [ ] Farcaster Mini-App video support (watch clip within Farcaster)
- [ ] Analytics: track video generation counts, shares, referral conversions
- [ ] A/B test: "Generate Game" vs "Generate Video" vs "Generate Both" conversion rates
- [ ] Gather user feedback on video quality, length, format preferences
- [ ] Performance tuning: reduce rendering latency, optimize 0G Storage uploads

**Principles check**: Enhancement first — sharing layers on existing Farcaster integration, doesn't add new auth/social infra.

### Wave 5 (August 8–21) — Growth & Demo Day Prep
**Goal**: Pitch next milestone, demo for Demo Day  
**Credits**: $12,500

- [ ] Polish: loading states, error recovery, retry logic for failed renders
- [ ] Video showcase page — gallery of generated clips/trailers
- [ ] Feature "Both" mode: one-click generate game + auto-produce shareable clip
- [ ] Draft Demo Day pitch deck
- [ ] Record Demo Day video (product demo + technical architecture + traction metrics)
- [ ] Prep for Token2049 Singapore showcase

**Principles check**: Consolidation review — what accumulated during buildathon that should be removed post-event?

---

## Consolidation Audit Checklist

To be completed before Wave 1 ends:

| Candidate | Status | Action |
|-----------|--------|--------|
| Lit Protocol service (`lib/lit-protocol.service.ts`) | Superseded by CDR vaults | ✅ Already removed — no `@lit-protocol/*` deps; CDR vaults handle legacy decrypt (`wordleAnswerVaultUuid` retained for pre-Inco games) |
| Narrative Preview Modal | Potentially superseded by video trailer | Keep for non-video flow; consider removing if video becomes default preview |
| Image gen providers with zero traffic | Check fallback chain logs | Remove dead providers from chain |
| `apps/writersarcade-api/cdr-vault.js` | Used for CDR | Keep — needed for CDR vaulting |
| ElevenLabs audio service | Used for video voiceover | Keep — enhanced use case |
| Pollinations image provider (if present) | Check if still in fallback chain | Remove if never triggered |
| Unused API routes from Mezo hackathon | Check `app/api/` | Remove routes that serve no active frontend feature |

**Target**: Remove more lines than the video module adds.

---

## Decision Log

| Question | Decision | Date |
|----------|----------|------|
| Output format model? | Co-equal — user chooses game / video / both at generation time | 2026-06-15 |
| Video tiers? | Two: 30s clip (auto, every gen) + 60-90s trailer (on demand) | 2026-06-15 |
| Replace any existing infra? | No. 0G Storage is additive (video hosting only). No chain migrations. | 2026-06-15 |
| Agentic ID (ERC-7857)? | Deferred to separate proposal. Not in scope for this buildathon. | 2026-06-15 |
| 0G Pay integration? | Deferred to Wave 4-5 evaluation. Not blocking. | 2026-06-15 |
| Strategy pattern for output formats? | Adopted — mirrors payments domain. Game + Video strategies. | 2026-06-15 |

---

## Open Questions

1. **Video rendering engine** — ffmpeg.wasm (browser-side, client downloads) vs Hetzner server-side render (Server, quality control) vs 0G Compute (decentralized)? Initial leaning: Hetzner backend with job queue, evaluate 0G Compute in Wave 3-4.
2. **Music** — Background music for clips. Licensed library? AI-generated (0G Compute)? User uploads? Initial: auto-select from royalty-free library, revisit with 0G Compute for AI music gen.
3. **Cost model** — Video generation is more expensive than game generation. What's the price? Flat fee? Tiered by length? Free clip generation to drive adoption? Decision deferred to Wave 2 after real cost measurement.
4. **Storage lifecycle** — How long do videos live on 0G Storage? Auto-cleanup after N days? Pinned for NFT-minted games? Decision: 30-day default TTL, permanent for minted/NFT-linked videos.
5. **0G credits usage** — Which Wave costs are covered by 0G credits vs. own infrastructure? Goal: maximize credit usage for Wave 3-4 heavy operations (Compute, Storage), minimize dependency risk.
