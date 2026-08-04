# Platform Features

## Core Flows

### Article → Game (Classic)
1. **Input**: Paste article URL → AI extracts assets
2. **Customize** (Optional): Edit characters & mechanics in Workshop
3. **Generate**: Compile assets into 5-panel comic story
4. **Refine**: Regenerate images with custom prompts + edit text
5. **Register**: Mint NFT & register IP on Story Protocol (user-owned)
6. **Revenue**: Splits executed on-chain (Writer/Platform/Creator)

### Marketing Copy → Playable Story (`/studio`)
1. **Input**: Paste landing page copy, email, or campaign text
2. **Choose tone**: Mystery, Comedy, or Horror
3. **Generate**: AI turns the copy into an interactive 5-panel story
4. **Play / embed**: Try it, share the embed code, or buy credits for more
5. **Analyze**: Use Resonance insights to see which framings readers choose

This flow is wallet-free for the first story and targets marketers, copywriters, and brand teams who want to test messaging through play.

## Key Features

### AI Game Generation
- Article URL or pasted marketing copy → AI extracts characters, story beats, mechanics
- Generates 5-panel comic with narrative
- Genre selection (horror, sci-fi, fantasy, mystery, comedy, etc.)
- Multi-model AI pipeline (OpenAI, Anthropic via ai-sdk)

### Progressive Identity (No Wallet Required)
- Start instantly as an anonymous guest
- Attach an email at any time via magic link to preserve progress across devices
- Connect a wallet later to mint NFTs, register IP, or receive on-chain revenue
- Automatic merge: games, credits, and payments follow the user across identity upgrades

### `/studio` — Copy-to-Story
- Paste up to 20,000 characters of marketing copy
- Pick a tone (mystery, comedy, horror)
- First story is free (one demo per actor/IP); subsequent stories cost credits
- One-click upgrade to credit packs when the free demo is used

### Embeddable Wallet-Free Player
- `/embed/[slug]` serves an lightweight iframe player
- No wallet connection required; readers play inside the host page
- `?ref=YOUR_CAMPAIGN` attribution tracked in Resonance analytics
- "Made with WritersArcade" backlink drives organic acquisition
- ISR-cached for fast loads

### Resonance Dashboard
Owner-gated analytics at `/games/[slug]/insights`:
- **Resonance score**: completions / starts (shown once ≥ 5 starts)
- **Panel funnel**: drop-off at each panel and choice
- **Choice splits**: percentage of readers choosing each option
- **Referrers**: which campaigns / placements drive starts
- **Embed snippet**: copy-paste HTML with `?ref=` tracking

### Asset Workshop
- **Decomposition Engine**: Breaks articles into reusable assets
- **WYSIWYG Editor**: Edit characters, mechanics, visuals
- **Marketplace Sidebar**: Inject community assets into games
- **Database Persistence**: Save drafts, iterate over time
- Assets typed as: `pack`, `character`, `mechanic`, `plot`

### Image Generation (Multi-Provider)
Auto-fallback chain ensures reliability:

1. **Venice AI** (Primary) - `venice-sd35`, 1024x1024
2. **Modal** (Fallback 1) - Self-hosted SD 1.5, 512x512, pay-per-use GPU
3. **Netmind AI** (Fallback 2) - OpenAI-compatible API

See [docs/MODAL_SETUP.md](./MODAL_SETUP.md) for Modal deployment.

### Mezo MUSD Payments (Hackathon Track)
WritersArcade supports the Mezo ecosystem via a dedicated MUSD payment track:

- **MUSD Strategy**: Native payment support on Mezo Matsnet (Chain ID 31611).
- **On-chain Splitter**: Uses `MezoPaymentSplitter` to atomically distribute MUSD to writers, creators, and the platform.
- **MEZO Holder Perks**:
    - **Detection**: `useMezoBalance` hook detects MEZO token holders on-chain.
    - **Badge**: "MEZO Holder" status surfaces in the payment flow for wallets with ≥ 1 MEZO.
    - **Future-Proof**: Roadmap includes on-chain boosted splits for MEZO holders via `MezoBoostedSplitter`.

### Creative Control
- **Image Regeneration**: "New Image" button per panel with loading state
- **Prompt Editing**: View/edit prompts, regenerate with custom text
- **Narrative Editing**: Hover-to-edit text in finale before minting
- **Real-time Downloads**: Edited text exported in PNG comic download

### Comic Finale — Narration & Animation
The post-game finale (`domains/games/components/comic-book-finale.tsx`) is layered over
self-contained hooks + presentational components so each feature stays testable:

- **Voice Narration** (`finale-narration.tsx`): `useNarration` owns per-panel TTS
  caching, batch generation with progress %, per-panel regeneration, play/pause, and
  cinematic auto-play that advances panels. `NarrationControls` renders the toolbar
  (Narration button, Play/Pause, regenerate, Cinematic toggle). Panel 1 audio is
  pre-generated on mount; the next panel's image+audio are prefetched for snappy nav.
- **Video Animation Upsell** (`finale-video-motion.tsx` + `finale-video-screen.tsx`):
  `useVideoMotion(gameSlug)` owns status polling (only while `pending`), per-panel
  lookup, the start request, and style/error state. UI pieces are `VideoUpsellCTA`
  (Animate → Animated), `CinematicToggleButton`, `VideoStyleModal` (Radix `Dialog`),
  and `FinaleCinematicView` (`VideoShowcase` + `CreatorStats`). Completed animations
  surface in `FinaleCinematicView` and mark the game card with an "Animated" badge,
  plus attach a video URL to Twitter/Farcaster share copy.

### NFT Minting
- Mint games as NFTs on Base mainnet
- WriterCoinPayment contract handles payments + revenue splits
- On-chain metadata (creator, article URL, genre, difficulty)
- Compact success modal navigates to game page

### Farcaster Mini-App
- Full gameplay experience within Farcaster client
- Uses `@farcaster/miniapp-sdk`
- Calls `sdk.actions.ready()` when UI loads
- Shares same API routes as web app

## Integrations

### Story Protocol (IP Registration)

**Network**: Story Aeneid testnet (Chain ID: 1516)  
**SDK**: `@story-protocol/core-sdk@^1.4.2`  
**Integration**: Client-side wallet signing (no platform keys)

**Features**:
- **User-owned IP**: Users sign transactions - they own the IP
- **PIL Licenses**: Commercial Remix licenses (10% royalty default)
- **Automatic metadata**: Game details, attribution, assets on IPFS
- **Derivative royalties**: Original creators earn from remixes
- **On-chain tracking**: Parent-child relationships recorded
- **Claimable revenue**: Royalty claiming UI for IP owners

**License Types**:
- **Non-Commercial Social Remixing** (ID: 1) - Free, derivatives allowed
- **Commercial Remix** (ID: 2) - Derivatives with revenue share (default)
- **Commercial Use** (ID: 3) - No derivatives allowed

**IP Registration Flow**:
1. User connects wallet, clicks "Register IP"
2. App validates wallet + network (switch to Story if needed)
3. Gas estimation with 15% buffer
4. User selects license type
5. Metadata uploaded to IPFS via Pinata, with Grove fallback
6. User signs transaction in wallet
7. IP registered on-chain with license
8. Verification: Read IP Asset to confirm

#### Confidential Data Rails (CDR) — *Hackathon Track*
**Beta Integration**: Story CDR SDK for TEE-backed data vaults.

- **Secret Panel Vaults**: Hidden epilogues are stored in CDR vaults and decrypted client-side only after the player satisfies the unlock policy.
- **Token-Gated Read Conditions**: Secret panel vaults use CDR `tokenGate` read conditions against the configured Game NFT contract.
- **Gameplay-Aware Unlock**: The app verifies the player completed all 5 story panels before allowing the CDR decrypt path.
- **Exact NFT Ownership**: The unlock endpoint verifies ownership of the minted `nftTokenId`, not just any NFT in the collection.
- **Provable Fairness**: Wordle answers are stored in CDR vaults instead of plaintext database fields.
- **Bundle Hygiene**: The CDR SDK/WASM graph is lazy-loaded only when vaulted data must be decrypted.

**Secret Panel Flow**:
```
Game Generation
  ↓
generateSecretPanel()
  ↓
vaultSystemPrompt() → Story CDR vault UUID
  ↓
Store promptVaultUuid in DB
  ↓
Player completes 5 panels + owns minted Game NFT
  ↓
Client decrypts CDR vault with wallet-backed CDR client
```

**Explorer**: https://aeneid-testnet-explorer.story.foundation/

### Lit Protocol (NFT-Gated Content)

**Network**: Datil-dev testnet  
**Packages**: `@lit-protocol/lit-node-client`, `@lit-protocol/encryption`, `@lit-protocol/access-control-conditions`

**Features**:
- **Secret Panels**: 6th "secret panel" - encrypted epilogue only NFT holders can decrypt
- **Access Control**: ERC721 ownership check on Base mainnet
- **Server-side encryption**: After game generation (no auth required)
- **Client-side decryption**: NFT holder decrypts in browser (wallet auth)
- **Graceful degradation**: Base64 encoding when Lit nodes unavailable

**Flow**:
```
Game Generation → Save to DB
                      ↓ (async, non-blocking)
          generateSecretPanel()
                      ↓
          encryptSecretPanel() (Lit Protocol)
                      ↓
          Store ciphertext in DB
                      ↓
          NFT holder decrypts client-side → reveals epilogue
```

### Hypercerts (Impact Certificates)

**Protocol**: AT Protocol (AtpAgent)  
**PDS**: certified.app

**Features**:
- **Auto-created**: Impact certificate for each game created
- **Contributors**: Writer (50%), Creator (40%), Platform (10%)
- **Measurements**: Panel count, article fidelity score
- **Attachments**: Game metadata, article URL
- **Fallback**: Mock URIs when AT Protocol credentials not configured

**Flow**:
```
Game Creation → createGameHypercert() (async, non-blocking)
                      ↓
          AtpAgent.login() with handle + app password
                      ↓
          Create hypercert with contributors, measurements
                      ↓
          Save URI to Game.hypercertUri + Game.hypercertCid
```

### IPFS Storage (Pinata + Grove)

**Primary**: `PINATA_JWT` environment variable
**Fallback**: Grove immutable upload via `https://api.grove.storage`, using `GROVE_CHAIN_ID` (defaults to Base mainnet `8453`)
**Usage**: Metadata uploads for Story Protocol IP registration

- Production: Server-side upload route tries Pinata first, then Grove fallback if Pinata is missing or fails
- Development: Mock IPFS hash generation (for testing)
- Browser clients call `/api/ipfs/upload`; server secrets are never read from the client bundle

## Writer Coins (Base Mainnet)

| Writer | Symbol | Contract |
|---|---|---|
| Fred Wilson (AVC) | $AVC | 0x06FC3D5D2369561e28F261148576520F5e49D6ea |
| Debbie Soon | $DEBBIE | 0x4ea5d3ff9e8295a552903d4bd486ce8cf8291c60 |
| Blog of Jake | $JAKE | 0xC2E3A4d07fdff60f3CdCb39FD94Fc11F254938B9 |
| Tso's Thoughts | $TSO | 0x8072FC8Ee6Fd17B913833F2789bC9aa99D21AAeB |
| Papa | $PARAPAPA | 0x300efb94e4a7fcf71184eeeb82cb2b7af4a6ea58 |

Writer profiles: https://writersarcade.vercel.app/writers

## Revenue Model

**On-chain, configurable per writer coin**:

### Generation Splits
- 60% → Writer (content collaboration)
- 20% → Platform (operations)
- 20% → Creator pool (ongoing revenue)

### Minting Splits
- 30% → Creator
- 15% → Writer
- 5% → Platform
- Remainder → Returned to payer

Splits fetched live from contract via `fetchGenerationDistributionOnChain()` / `fetchMintDistributionOnChain()` with local-config fallback.

## Quality & UX Features

### Narrative Preview Modal
- Shows first panel narrative before payment/gameplay
- Displays opening scene, player choices, game stats
- Blocks progression until user confirms

### Article Fidelity Review
- Shows article themes vs generated game side-by-side
- Approve/Reject with API calls
- Creator-gated approval workflow

### Post-Game Feedback (NPS)
- Multi-step: NPS score (0-10) + optional comment
- Shows after NFT mint in finale
- API: `POST /api/games/[slug]/feedback`

### Error Handling
- Red banner for network errors (no alert dialogs)
- Auto-retry after 2 seconds
- User-friendly error messages for wallet/chain issues

## Smart Contracts

### GameNFT (ERC-721)
**Address**: `NEXT_PUBLIC_GAME_NFT_MAINNET` (Base Mainnet)
- Mints games as NFTs on Base mainnet
- On-chain metadata: creator, article URL, genre, difficulty
- ERC-2981 royalties and collection metadata

### WriterCoinPayment
**Address**: `NEXT_PUBLIC_WRITER_COIN_PAYMENT_MAINNET` (Base Mainnet)
- Handles writer coin payments for generation + minting
- Dynamic revenue splits (configurable per coin)
- SafeERC20 transfers, reentrancy guards, pause control
- Full mint-cost collection with creator/writer/platform distribution and minter refund

### MezoPaymentSplitter
**Address**: `0x32D0356f533cC429F94Db73f383bBb21a459E16b` (Mezo Matsnet)
- Native MUSD payment handler for Mezo Hackathon.
- Atomic on-chain splitting of Bitcoin-backed stablecoins.
- Verified on Mezo Explorer.
