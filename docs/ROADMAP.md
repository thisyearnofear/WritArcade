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
