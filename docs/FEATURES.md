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

### Daily Challenge (Inco Confidential Game Sessions)

**Integration**: `DailyChallengeVault.sol` + `@inco/lightning-js` + BasePaint API

Each day, a featured source (BasePaint daily canvas, article, or marketing copy) becomes a shared challenge. Every playthrough deals 5 encrypted modifier cards from a 52-card deck — same source, different story constraints, provably fair.

- **Encrypted Modifier Deck**: 52 narrative constraint cards shuffled once per day on-chain via `e.shuffledRange()`. The order is encrypted — nobody can predict it.
- **5 Encrypted Cards Per Player**: Each player draws the next 5 cards from the shared deck via `startSession()` (no duplicates within a session). Only the player can decrypt at reveal.
- **Hidden AI Constraints**: The backend decrypts each panel's card (via `narrativeOperator`) to shape AI generation. The player never sees the modifier until the finale.
- **Encrypted Scoring**: Player choices are compared against the hidden modifier's optimal path via `e.select()` and `e.eq()`. Score stays encrypted until reveal.
- **Reveal at Finale**: `completeAndReveal()` publishes handles; the client decrypts via `attestedDecrypt` and submits to the leaderboard.
- **BasePaint Crossover**: Today's BasePaint theme + canvas image becomes the story source. The pixel art aesthetic and palette shape the AI-generated comic panels.

**Flow**:
```
Cron or POST /api/daily-challenge/setup
  ↓
DailyChallengeVault.createDailyChallenge(day) → e.shuffledRange(1..52)
  ↓
Player calls startSession(day) → 5 encrypted cards dealt (narrativeOperator + player get allow)
  ↓
Each panel: server decrypts card for AI only → generatePanelWithModifier()
  ↓
Player choice → POST /record-choice → encrypted score delta on-chain
  ↓
Finale: completeAndReveal() → attestedDecrypt → leaderboard
```

**Smart Contract**: [`DailyChallengeVault`](https://basescan.org/address/0x0bb738ee11839baa44aa46984997f9417733dcce) on Base mainnet  
**Cron**: `vercel.json` shuffles the deck daily at 00:05 UTC (`CRON_SECRET` required)
**SDK**: `@inco/lightning-js` — `attestedDecrypt` for modifier/score reveal
**Modifier Deck**: `lib/modifiers.json` — 52 cards across 4 categories
**Page**: `/daily` — challenge card, leaderboard, play button

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

#### Inco Confidential Compute (Secret Panels) — *Primary*
**Integration**: Inco Lightning (`@inco/lightning-js`) for on-chain encrypted secret panels and Wordle answers.

- **On-Chain Encryption**: Secret panel JSON is split into ≤31-byte chunks, encrypted via `@inco/lightning-js`, and stored as multiple `euint256` handles in `SecretPanelVault.sol`.
- **Programmable Access Control**: `e.allow(handle, nftOwner)` — only the current NFT holder can decrypt. Enforced by Inco covalidators.
- **Attested Decrypt**: NFT holder decrypts via `zap.attestedDecrypt(walletClient, [handle])` — a signed covalidator attestation, not a trusted server.
- **Gameplay-Aware Unlock**: App verifies the player completed all 5 story panels before allowing decryption.
- **Provable Fairness**: Wordle answers encrypted on-chain via Inco instead of plaintext database fields.
- **Bundle Hygiene**: `@inco/lightning-js` is pure JS (no 5.5 MB WASM like CDR SDK).

**Secret Panel Flow**:
```
Game Generation
  ↓
generateSecretPanel() → store JSON in DB (pre-encryption)
  ↓
NFT minted → storeSecretPanel(tokenId, ciphertextChunks[]) on-chain
  ↓
promptVaultUuid = "inco:<tokenId>" in DB
  ↓
Player completes 5 panels + owns minted Game NFT
  ↓
Client calls attestedDecrypt via @inco/lightning-js → reveals epilogue
```

**Smart Contract**: [`SecretPanelVault`](https://basescan.org/address/0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8) on Base mainnet — `gameNFT` set to production [`GameNFT`](https://basescan.org/address/0x32D0356f533cC429F94Db73f383bBb21a459E16b)

**SDK**: `@inco/lightning-js` + `@inco/lightning` (Solidity, install via Bun)
**Docs**: https://docs.inco.org

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
