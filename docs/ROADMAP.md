# Roadmap & Status

## Current Status

**Live**: https://writersarcade.vercel.app/  
**Contracts**: Base mainnet (see addresses in [docs/FEATURES.md](./FEATURES.md))  
**Story Protocol**: Aeneid testnet (Chain ID: 1516)

## Completed Phases

### Phase 1-6: Foundation & MVP
- ✅ Article-to-game generation pipeline
- ✅ Comic panel rendering
- ✅ NFT minting on Base
- ✅ Writer coin payments
- ✅ Smart contracts deployed to Base mainnet
- ✅ Asset Workshop UI (WYSIWYG editor)
- ✅ Decomposition Engine (articles → assets)
- ✅ One-click IP minting to Story Protocol
- ✅ Marketplace sidebar (community assets)

### Phase 7: MVP Enhancements
- ✅ Asset preview & edit (Workshop page with inline editing)
- ✅ Image regeneration ("New Image" button per panel)
- ✅ Prompt visibility (view/edit prompts)
- ✅ Copy editing (narrative text editable in finale)
- ✅ Toast notifications for all actions
- ✅ Real-time downloads with edited text

### Phase 8: Quality & UX
- ✅ Narrative Preview Modal (before payment/gameplay)
- ✅ Article Fidelity Review (approve/reject workflow)
- ✅ Post-Game Feedback (NPS scoring)
- ✅ Database schema: `approvalStatus`, `articleFidelityScore`, `GameFeedback`, `PanelRating`
- ✅ ErrorBoundary wrapping gameplay components

### Phase 9: Production Polish
- ✅ 5 writer coins (AVC, DEBBIE, JAKE, TSO, PARAPAPA)
- ✅ Writer profile pages (`/writers/[coinId]`)
- ✅ Editorial redesign (typography-first UI)
- ✅ LicenseConfigurator wired to real `registerPILTerms`
- ✅ Creator Dashboard link (whitelisted writer wallets)
- ✅ IPAttribution bar above fold on game pages
- ✅ Homepage live stat (game count from API)
- ✅ Context-aware empty states
- ✅ DRY cleanup (zero `@ts-expect-error` suppressions)

### Phase 10: Asset Marketplace
- ✅ Marketplace discovery (`/assets` in navigation)
- ✅ API pagination + filtering (limit, offset, genre)
- ✅ End-to-end genre filtering
- ✅ Create page fix (API fetch pattern)

### Phase 11: Asset Derivation
- ✅ Post-mint asset extraction (`extractAndSaveGameAssets()`)
- ✅ PATCH handler wiring in `/api/games/mint`
- ✅ Story Protocol derivative path (`registerDerivativeIp()`)

### Phase 12: PL Genesis (Lit Protocol + Hypercerts)
- ✅ Lit Protocol service (encrypt/decrypt with ERC721 ACCs)
- ✅ Secret Panel component (locked/unlocked UI, blur-to-reveal)
- ✅ Secret Panel API (NFT ownership verification → decrypt)
- ✅ Hypercerts service (AT Protocol impact certificates)
- ✅ Hypercert Badge component
- ✅ Background enrichment (`enrichGameInBackground()` - non-blocking)
- ✅ Config & schema updates

### Mezo Hackathon Integration (MUSD) — April–May 2026
- ✅ Mezo Matsnet (testnet) chain config (chainId 31611, RPC `https://rpc.test.mezo.org`)
- ✅ Multi-chain simulation via Tenderly
- ✅ MUSD payment architecture (Strategy Pattern) decoupled from Base
- ✅ `MezoPaymentSplitter` deployed to Mezo Testnet at [`0x32D0356f533cC429F94Db73f383bBb21a459E16b`](https://explorer.test.mezo.org/address/0x32D0356f533cC429F94Db73f383bBb21a459E16b)
- ✅ `MUSDStrategy` wired to call `approve` → `payForGeneration` / `payAndMintGame` on the splitter (atomic on-chain platform/creator/writer split)
- ✅ UI updated for Mezo Passport & MUSD toggles
- ✅ MEZO touchpoint (Phase 1): on-chain `useMezoBalance` reads from MEZO ERC-20 (`0x7B7c…0001`), "MEZO Holder" badge surfaces in the MUSD payment flow when balance ≥ `MEZO_CONFIG.holderThreshold`
- ✅ **`MezoBoostedSplitter` deployed** at [`0x56Ee5A3f122da00B635DdbB319708e24450aEB89`](https://explorer.test.mezo.org/address/0x56Ee5A3f122da00B635DdbB319708e24450aEB89) — 10% creator share boost for MEZO holders, enforced on-chain
- ✅ **Real MUSD balance reading** — `useMUSDBalance` hook replaces mocked "Available" with on-chain balance
- ✅ **One-click payment flow** — removed intermediate "review payment" gate; PaymentOption always visible; pay and generate in one action
- ✅ **Simplified form UX** — Wordle mode hidden for clean narrative focus; submit button always visible; success state resets deferred to modal close
- ✅ **Critial env bug fix** — `NEXT_PUBLIC_MEZO_PAYMENT_SPLITTER_TESTNET` was pointing to MUSD token address instead of the splitter contract
- ✅ **Hackathon submission doc** — `HACKATHON_SUBMISSION.md` with architecture, contract addresses, flow diagrams
- ✅ **TypeScript fixed** — removed deprecated `ignoreDeprecations`, installed deps, fixed null-check — `tsc --noEmit` passes cleanly
- ✅ **Wordle revived** — free tier toggle restored alongside Story, Farcaster sharing on win screen, Daily Wordle section on homepage
- ✅ **Mezo Analytics dashboard** — `/mezo/analytics` page with live on-chain reads from MezoBoostedSplitter (viem → API route → stat cards, boosted ratio, recent activity feed); Goldsky pipeline config updated for v2 contract address

### Phase 13: Wordle Revival + Farcaster — May 2026
- ✅ Wordle toggle restored as free tier alongside Story (premium)
- ✅ Farcaster sharing on Wordle win screen (share results as casts)
- ✅ Daily Wordle section on homepage
- ✅ CDR Hackathon integration (May 27–June 5): store Wordle answers and secret panels in CDR vaults; lazy-load SDK/WASM; gate secret panels by completed gameplay + minted Game NFT ownership

### CDR Hackathon Strategy (May 27 – June 5, 2026)

**Event:** [CDR (Confidential Data Rails) Hackathon](https://build.usecdr.dev/) by Story Protocol. $3k prizes.

**WritersArcade Strategy: From Gated Content to Confidential IP**

We are transitioning our "Secret Panel" logic from Lit Protocol (ERC-721 gating) to **Story Confidential Data Rails (CDR)**. This moves us from simple "access control" to true "Confidential IP" where the source data is protected by TEEs (Trusted Execution Environments).

**Integration Points:**

1. **TEE-Backed Secret Panels (Vaults):**
   - **Implemented:** AI-generated hidden epilogues are stored in CDR vaults as `promptVaultUuid`.
   - **Condition:** CDR `tokenGate` read condition points at the Game NFT contract selected from `writerCoinId`.
   - **Runtime Gate:** Unlock requires a completed 5-panel story session and exact `nftTokenId` ownership.
   - **Value:** Turns the story ending into confidential, ownable game IP instead of ordinary app-gated content.

2. **Provably Fair Wordle Answers:**
   - **Implemented:** Article-derived Wordle answers are stored in a CDR vault instead of plaintext DB fields.
   - **Current Scope:** Secondary proof point; final demo should emphasize secret panels as the richer CDR flow.
   - **Future Upgrade:** Add reveal-after-game or give-up conditions for stronger technical judging.

3. **Confidential Asset Marketplace:**
   - Asset creators can upload "Confidential Assets" (high-res textures, original character sketches) that are only revealed to buyers.
   - CDR handles the dynamic access control based on Story Protocol licensing terms.

**Why we are a Top Candidate:**
- **Adjacency:** Already live on Story Aeneid; low friction to adopt CDR SDK.
- **Product-Market Fit:** Enables a "Trade Secret" marketplace where prompt engineering is monetizable without being clonable.
- **Technical Polish:** Existing Lit Protocol logic provides a perfect "before" case for a "before/after" CDR implementation demo.

**Timeline:**
- **May 27-29:** Research CDR SDK, integrate SDK, resolve WASM/webpack build issues.
- **May 30:** Implement CDR vaulted Wordle answers and CDR vaulted secret panels.
- **May 30:** Add completed-playthrough + exact NFT ownership unlock policy and visible access-policy UI.
- **June 1-4:** Runtime demo QA, fresh-game demo recording, final submission polish.

## Platform Maturity

| Component | Status | Notes |
|-----------|--------|-------|
| Game Generation | ✅ Production | Multi-model AI pipeline |
| Asset Workshop | ✅ Production | Full WYSIWYG editor |
| NFT Minting | ✅ Production | Base mainnet |
| Story Protocol IP | ✅ Testnet | Aeneid (not yet on Base mainnet) |
| Lit Protocol | ✅ Production | NFT-gated secret panels |
| Story CDR | ✅ Hackathon-ready | Vaulted Wordle answers + token-gated secret panels |
| Hypercerts | ✅ Production | Impact certificates |
| Image Generation | ✅ Production | Multi-provider fallback |
| Payments | ✅ Production | 5 writer coins |
| Marketplace | ✅ Production | Browse + compose |

## Future Roadmap

### Phase 13: Media Expansion
- ElevenLabs audio narration for panels
- Video export of comics
- Social sharing integrations
- Animated panel transitions

### Phase 14: Advanced Gameplay
- Branching narratives with consequences
- Character stats that affect outcomes
- Multiplayer story contributions
- Persistent game worlds across sessions

### Phase 15: Farcaster Integration
- Farcaster webhook notifications
- Push notifications for new games from followed writers
- `NotificationToken` model in Prisma schema
- Social sharing to Farcaster casts

### Phase 16: Story Protocol Mainnet
- Deploy to Story Protocol mainnet (when available on Base)
- Multi-asset derivative games
- Royalty payment automation
- Cross-chain IP verification

### Phase 17: Platform Scaling
- Redis caching for frequently accessed data
- BullMQ background job processing
- Database read replicas
- CDN for static assets
- Load balancing across regions
- Application performance monitoring (APM)
- Smart contract event monitoring

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI generation failures | Retry logic, multiple model fallbacks |
| Story Protocol testnet issues | Mock mode for demos, graceful degradation |
| Image generation slow | Parallel generation, optimistic UI |
| Network dependency | Multi-provider fallback chain |
| User confusion | Progress indicators, tooltips, empty states |

## Collaboration Model

**On-chain revenue distribution** (configurable per writer coin):
- **Generation**: 60% Writer / 20% Platform / 20% Creator Pool
- **Minting**: 50% Creator / 15% Writer / 5% Platform (30% refunded to minter)

This ensures:
- Writers earn from readers using their content creatively
- Creators are rewarded for personalization work
- Platform sustainability for ongoing development

## Key Resources

- **Live Site**: https://writersarcade.vercel.app/
- **Story Protocol Docs**: https://docs.story.foundation/
- **Story Protocol Explorer**: https://aeneid-testnet-explorer.story.foundation/
- **Base Explorer**: https://basescan.org/
- **Farcaster Mini-App Docs**: https://docs.farcaster.xyz/mini-apps
