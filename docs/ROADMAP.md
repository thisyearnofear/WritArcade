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
- ⏳ CDR Hackathon integration (May 27–June 5): store Wordle answers in CDR vaults for provably fair answer gating; programmable reveal conditions via TEEs; combined with Story Protocol IP registration

### CDR Hackathon Strategy (May 27 – June 5, 2026)

**Event:** [CDR (Confidential Data Rails) Hackathon](https://build.usecdr.dev/) by Story Protocol. $3k prizes.

**Integration points for Writersarcade:**

1. **Wordle answer gating with CDR vaults:**
   - Store the article-derived Wordle answer inside a CDR vault
   - Programmable condition: *reveal to the player after they submit a guess, but never expose the answer beforehand*
   - Makes Wordle **provably fair** — not even the developer can see the answer early
   - Combined with Story Protocol IP registration of the puzzle

2. **Article content vaulting:**
   - Store scraped article content in a CDR vault
   - Grant the AI generation service access through the vault (not direct DB access)
   - Register generated game IP on Story Protocol with a reference back to the vault

3. **Go further:** Agent-to-agent data deals (Wordle answer → agent negotiates with publisher's agent for article text), token-gated premium Wordle puzzles, private game state across sessions.

**Why participate:** Low effort (Wordle is already built, just needs vault wrapping), strong fit for "Best CDR Application" track (polished UX + product thinking), Story Protocol adjacency.

**Timeline:** May 27 workshops → June 3 projects due → June 5 demo day. Focus on Mezo submission first, then pivot.

## Platform Maturity

| Component | Status | Notes |
|-----------|--------|-------|
| Game Generation | ✅ Production | Multi-model AI pipeline |
| Asset Workshop | ✅ Production | Full WYSIWYG editor |
| NFT Minting | ✅ Production | Base mainnet |
| Story Protocol IP | ✅ Testnet | Aeneid (not yet on Base mainnet) |
| Lit Protocol | ✅ Production | NFT-gated secret panels |
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
- **Minting**: 30% Creator / 15% Writer / 5% Platform (remainder to payer)

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
