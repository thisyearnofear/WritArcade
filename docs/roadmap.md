# writersarcade Roadmap & Status

**Last Updated:** March 6, 2026
**Status:** Phase 9 - Production Ready (Base Batches submission)

---

## 🎯 Current Focus: Customization MVP

### Vision Statement
> "Turn any article into a personalized visual comic story you own as IP."

### The User Story
> "I read Fred's article about AI, turned it into a horror comic about my startup, tweaked the villain to look like my ex-VC, and minted it as IP on Story Protocol."

### Hackathon Alignment
**Track**: Creative Front-End ($5,000 prize)
> "Create intuitive, aesthetic, and user-friendly front-ends for popular IP x AI use cases—seamlessly integrated with the Story SDK and IP registration flows."

writersarcade delivers:
- Web/mobile app optimized for easy IP Registration ✅
- AI-powered content generation with Story Protocol integration ✅
- User personalization at every step of the creative flow ⬅️ **BUILDING NOW**

---

## MVP Feature Set (Phase 7)

### ✅ Complete (Existing)
1. **Article-to-Comic Generation**: Paste URL → AI generates comic panels
2. **Comic Panel Rendering**: Beautiful, styled comic book interface
3. **Story Protocol Integration**: Register comics as IP assets
4. **NFT Minting**: Mint completed comics on Base chain
5. **Writer Attribution**: Source author earns royalties

### ✅ Complete (This Phase - MVP Enhancements)
1. **Asset Preview & Edit**: Workshop page with inline title AND description editing for characters, mechanics, story beats
2. **Image Regeneration**: "New Image" button on each panel with loading state
3. **Prompt Visibility**: View/edit the prompt used for image generation, regenerate with custom prompts
4. **Copy Editing**: Narrative text editable in finale before minting (hover to reveal pencil icon)
5. **Navigation Cleanup**: Assets hidden from nav to focus on core flow
6. **Flow Discovery**: Link to Workshop from generate page tips
7. **Toast Notifications**: Success/error feedback for all editing and regeneration actions
8. **Real-time Downloads**: Edited text correctly exported in PNG comic download

### ✅ Complete (Phase 9 - Production Polish, March 2026)
1. **5 Writer Coins**: Added Debbie Soon ($DEBBIE), Blog of Jake ($JAKE), Tso's Thoughts ($TSO), Papa ($PARAPAPA) alongside AVC
2. **Writer Profile Pages**: `/writers/[coinId]` — bio, game count, games grid, empty state CTA
3. **Editorial Redesign**: Removed neon/arcade aesthetic; typography-first UI for writers and developers
4. **LicenseConfigurator**: Wired to real `registerPILTerms` on-chain call (no mock save)
5. **ErrorBoundary**: Wraps `GamePlayInterface` and `GameGeneratorForm`
6. **Creator Dashboard link**: Conditionally shown in header for whitelisted writer wallets
7. **IPAttribution above fold**: Compact attribution bar shown before game on game pages
8. **Homepage live stat**: Game count fetched from `/api/games/stats`
9. **Empty states**: Context-aware CTAs on The Arcade when no games match filter
10. **DRY cleanup**: Deleted unused `story-config.ts`; zero `@ts-expect-error` suppressions

### 🔒 Deferred (Future Phases)
- Asset Marketplace discovery *(hidden from nav, exists at /assets)*
- Asset derivation from completed comics
- ElevenLabs audio/video integration
- Multiplayer story contributions
- Advanced game mechanics (stats, branching)

---

## Implementation Plan

### Sprint 1: Creative Intervention Points (3-4 days)

#### 1.1 Asset Preview Step
**Location**: Enhance `/app/mini-app/page.tsx` or create new step in generation flow
**Goal**: After article URL submitted, show extracted assets before generating comic
**Changes**:
- Add "preview" state between URL input and game generation
- Reuse `GameAIService.generateAssets()` to extract characters, mechanics, story beats
- Display editable cards for each asset
- "Generate Comic" button compiles edited assets into final game

#### 1.2 Inline Asset Editing
**Location**: New component or enhance existing flow
**Goal**: Users can edit character names, personalities, story beats before generation
**Changes**:
- ContentEditable or input fields for each asset property
- Real-time preview updates ✅
- Preserve edits through generation ✅

### Sprint 2: Image Regeneration ✅ COMPLETE

#### 2.1 Regenerate Button per Panel ✅
**Location**: `domains/games/components/comic-panel-card.tsx`
**Implemented**:
- "New Image" button in image overlay
- Spinning animation during regeneration
- Toast notifications for success/failure

#### 2.2 Prompt Visibility ✅
**Location**: `comic-panel-card.tsx`
**Implemented**:
- Collapsible "View/Edit Prompt" section
- Toggle between Original and Custom prompt modes
- Regenerate with custom prompt support

### Sprint 3: Copy Editing in Finale ✅ COMPLETE

#### 3.1 Editable Narrative ✅
**Location**: `domains/games/components/comic-book-finale.tsx`
**Implemented**:
- Hover-to-reveal pencil icon on narrative text
- Inline textarea editing with Save/Cancel
- Toast notification on save
- Changes persist to download/mint

#### 3.2 Polish & Flow
**Location**: Various
**Goal**: Smooth single-session experience
**Changes**:
- Progress indicator showing current step
- Clear "Next" actions at each stage
- Updated IPFS metadata includes all user customizations

### Sprint 4: Navigation Cleanup (0.5 days)

#### 4.1 Hide Assets from Nav
**Location**: Navigation components
**Goal**: Focus user attention on core flow
**Changes**:
- Remove /assets from main navigation
- Keep route accessible for direct URL access
- Add "Asset Library (Coming Soon)" teaser if desired

---

## Technical Architecture

### Current Flow
```
Article URL → AI Generate Game → Play (5 panels) → Finale → Mint
```

### New Flow (MVP)
```
Article URL 
    → AI Extract Assets (preview) 
    → [EDIT: Assets] 
    → AI Compile Comic 
    → Play (5 panels with regeneration) 
    → [EDIT: Narrative text]
    → Finale 
    → Register IP on Story Protocol
    → Mint NFT on Base
```

### Key Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `GameAIService.generateAssets()` | Extract assets from article | ✅ Live |
| `GameAIService.generateGame()` | Compile assets into game | ✅ Live |
| `ImageGenerationService` | Generate panel images | ✅ Live |
| `StoryProtocolAssetService` | Register IP | ✅ Live |
| `ComicPanelCard` | Render panels + regenerate | ✅ Enhanced |
| `ComicBookFinale` | Final comic + text editing | ✅ Enhanced |
| `AssetCard` | Asset display + inline edit | ✅ Enhanced |
| `GamePlayInterface` | Wire regeneration + editing | ✅ Enhanced |
| Asset Preview UI (Workshop) | Show/edit assets before compilation | ✅ Live |

---

## Success Criteria

### Hackathon Demo
- [x] User pastes article URL
- [x] Assets extracted and shown for editing (Workshop: /workshop)
- [x] User modifies a character name (inline editing)
- [x] Comic generated with customization
- [x] User regenerates one panel image ("New Image" button)
- [x] User edits narrative text (pencil icon in finale)
- [x] User mints as IP on Story Protocol
- [x] Transaction confirmed, IP registered

### Metrics
- Complete flow in < 5 minutes
- Zero crashes during demo
- Story Protocol IP ID visible in UI
- All customizations preserved in minted metadata

---

## Collaboration Model (Unchanged)

**On-chain revenue distribution (configurable per writer coin):**
- **Generation**: 60% Writer, 20% Platform, 20% Creator Pool
- **Minting**: 30% Creator, 15% Writer, 5% Platform

This ensures:
- Writers earn from readers using their content creatively
- Creators are rewarded for personalization work
- Platform sustainability for ongoing development

---

## Phase 8: Quality & UX (Complete) ✅

### High-Impact UX Features (Integrated)

#### 1. Narrative Preview Modal ✅
**File**: `components/game/narrative-preview-modal.tsx`
- Location: Shows before payment/gameplay in `GamePlayInterface`
- Displays: First panel narrative + user choices
- Behavior: Blocks progression until user confirms
- Impact: Reduces abandonment, builds confidence

#### 2. Article Fidelity Review ✅
**File**: `components/game/article-fidelity-review.tsx`
- Location: Triggers after game generation in `GameGeneratorForm`
- Displays: Game preview with image + article context
- Actions: Approve/Reject with API calls to `/api/games/[slug]/approve`
- Impact: Ensures quality before players see games

#### 3. Post-Game Feedback (NPS) ✅
**File**: `components/game/post-game-feedback.tsx`
- Location: Shows after NFT mint in `ComicBookFinale`
- Workflow: NPS score (0-10) → Optional comment → Submit
- API: Calls `POST /api/games/[slug]/feedback`
- Impact: Data-driven improvements via NPS tracking

#### 4. API Endpoints ✅
- `POST /api/games/[slug]/feedback` - Submit feedback + NPS
- `GET /api/games/[slug]/feedback` - Retrieve aggregate stats
- `PATCH /api/games/[slug]/approve` - Approve/reject games (creator-gated)

#### 5. Database Updates ✅
- Fields added: `approvalStatus`, `articleFidelityScore`, `approvedAt`, `rejectionReason`
- Tables created: `GameFeedback`, `PanelRating`
- Status: Synced with `npx prisma db push`

**Integration Status**: All 3 components integrated into gameplay flow
**Build Status**: ✅ Compiles without errors (tested Dec 25)
**Ready for**: Testing and deployment

---

## Future Roadmap (Post-Phase 8)

### Phase 9: Quality Metrics Dashboard (Q4 2025)
- Admin panel showing NPS trends per game
- Fidelity score analysis + outlier detection
- Feedback submission tracking
- Approval workflow analytics

### Phase 10: Asset Marketplace (Q1 2026)
- Enable asset discovery at /assets
- Derive assets from completed comics
- Royalty chains via Story Protocol

### Phase 11: Media Expansion (Q2 2026)
- ElevenLabs audio narration
- Video export of comics
- Social sharing integrations

### Phase 12: Advanced Gameplay (Q3 2026)
- Branching narratives with consequences
- Character stats that affect outcomes
- Multiplayer story contributions

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI generation failures | Retry logic, multiple model fallbacks |
| Story Protocol testnet issues | Mock mode for demos, graceful degradation |
| Image generation slow | Parallel generation, optimistic UI |
| User confusion | Clear progress indicators, tooltips |

---

## Resources

### Story Protocol
- Docs: https://docs.story.foundation/
- SDK: Integrated via `@story-protocol/core-sdk`
- Network: Aeneid testnet (Chain ID: 1516)

### Tech Stack
- Frontend: Next.js 16 + TypeScript + TailwindCSS
- AI: OpenAI/Anthropic via ai-sdk, Venice AI for images
- Blockchain: Base (payments/NFT), Story Protocol (IP)
- Storage: IPFS via Pinata

---

*Last Updated: December 25, 2025 - Phase 8 Quality & UX Complete*