# Platform Features

## Core Flow

1. **Input**: Paste article URL → AI extracts assets
2. **Customize** (Optional): Edit characters & mechanics in Workshop
3. **Generate**: Compile assets into 5-panel comic story
4. **Refine**: Regenerate images with custom prompts + edit text
5. **Register**: Mint NFT & register IP on Story Protocol (user-owned)
6. **Revenue**: Splits executed on-chain (Writer/Platform/Creator)

## Key Features

### AI Game Generation
- Article URL → AI extracts characters, story beats, mechanics
- Generates 5-panel comic with narrative
- Genre selection (horror, sci-fi, fantasy, etc.)
- Multi-model AI pipeline (OpenAI, Anthropic via ai-sdk)

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

### Creative Control
- **Image Regeneration**: "New Image" button per panel with loading state
- **Prompt Editing**: View/edit prompts, regenerate with custom text
- **Narrative Editing**: Hover-to-edit text in finale before minting
- **Real-time Downloads**: Edited text exported in PNG comic download

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
5. Metadata uploaded to IPFS via Pinata
6. User signs transaction in wallet
7. IP registered on-chain with license
8. Verification: Read IP Asset to confirm

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

### IPFS Storage (Pinata)

**Required**: `PINATA_JWT` environment variable  
**Usage**: Metadata uploads for Story Protocol IP registration

- Production: Real Pinata upload (throws error if JWT missing)
- Development: Mock IPFS hash generation (for testing)

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
**Address**: `0x778C87dAA2b284982765688AE22832AADae7dccC`  
- Mints games as NFTs on Base mainnet
- On-chain metadata: creator, article URL, genre, difficulty
- Verified on Sourcify

### WriterCoinPayment
**Address**: `0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75`  
- Handles writer coin payments for generation + minting
- Dynamic revenue splits (configurable per coin)
- Reentrancy guards, access control
- Verified on Sourcify
