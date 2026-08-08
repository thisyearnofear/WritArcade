# Architecture

## Overview

writersarcade turns articles into interactive, mintable games. Players pay with writer coins, creators mint and share games, and revenue splits are enforced on-chain.

## System Architecture

### Dual-Product System

```
Article URL
  │
  ├─ Quick Games (MVP)
  │   └─ Generate → Play → Mint
  │
  └─ Asset Marketplace
      └─ Decompose → Edit/Compose → Generate → Mint
```

### Technology Stack

**Frontend**: Next.js 16 (App Router) + TypeScript + TailwindCSS + Framer Motion  
**Web3**: wagmi + viem + RainbowKit / WalletConnect  
**Backend**: Next.js API routes + Prisma + PostgreSQL  
**AI**: OpenAI/Anthropic (ai-sdk); Venice AI + Modal + Netmind (image generation)  
**Mezo**: MUSD (Bitcoin-backed stablecoin) for payments; Mezo Matsnet (testnet)
**IP**: Story Protocol (testnet) + IPFS (Pinata primary, Grove fallback)
**Access Control**: Inco confidential compute (on-chain encrypted secret panels via euint256 handles + attested decrypt)
**Impact**: Hypercerts (AT Protocol impact certificates)

### Project Structure

```
writarcade/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (environment-agnostic)
│   ├── mini-app/           # Farcaster mini-app
│   └── games/              # Web app routes
├── components/             # Shared React components
├── contracts/              # Solidity contracts (Foundry)
│   └── openzeppelin-contracts/  # Vendored OpenZeppelin source (build artifact)
├── docs/                   # Architecture, features, roadmap
│   └── plans/              # Roadmap & reflection plans
├── domains/                # Business logic by domain
│   ├── games/              # Game generation & management
│   ├── assets/             # Asset creation & marketplace
│   ├── payments/           # Payment processing (Strategy Pattern + Factory)
│   ├── content/            # Article processing
│   └── users/              # User management
├── hooks/                  # Custom React hooks
│   └── useMezoBalance.ts   # On-chain MEZO balance detection
├── lib/                    # Cross-cutting infrastructure
│   ├── basepaint/          # Daily Challenge & BasePaint source layer
│   ├── config.ts           # Central config (API keys, feature flags)
│   ├── contracts.ts        # On-chain contract helpers
│   ├── daily-challenge/    # Daily Challenge session & modifier logic
│   ├── integrations/       # Third-party integration modules
│   │   ├── etherfuse.ts    # Fiat onramp (credits)
│   │   ├── hypercerts.ts   # Impact certificates
│   │   ├── superrare.ts    # NFT collectibles
│   │   └── tenderly.ts     # Transaction simulation
│   ├── paragraph-sdk.ts    # Paragraph.xyz article fetching
│   ├── wallet/             # Wallet abstraction + chain config
│   └── writer-coins.ts     # Writer coin registry & pricing
├── prisma/                 # Database schema
├── public/                 # Static assets
├── scripts/                # Operational scripts
│   ├── deploy/             # Deployment scripts (Base, Mezo, API, goldsky)
│   ├── cron/               # Daily challenge cron + systemd unit
│   ├── maintenance/        # Data migrations, repairs, debugging tools
│   └── ci/                 # CI helpers, git hooks, setup verification
└── services/               # Domain-adjacent services moved from lib/
    ├── analytics.ts        # Event tracking
    ├── auth.ts             # Authentication helpers (actor resolution)
    ├── error-handler.ts    # User-facing error formatting
    └── rate-limit.ts       # API rate limiting
```

### API Response Standardization

All API routes should use the helpers from `lib/api-response.ts`:

```ts
import { ok, fail, notFound, unauthorized, paginated } from '@/lib/api-response'

// Success
return ok({ gameId: '...' })

// Error with status
return fail('Game not found', 404)

// Paginated list
return paginated(items, total, { limit, offset })
```

### Request Deduplication

`lib/request-dedup.ts` prevents concurrent duplicate API calls:

```ts
const data = await deduplicate('games:featured', () =>
  prisma.game.findMany({ where: { featured: true } })
)
```

### AI Generation Caching + Dedup

`lib/ai-cache.ts` provides:
- `buildGenerationCacheKey()` — deterministic key from URL + genre + difficulty + mode
- `getCachedGeneration()` / `setCachedGeneration()` — 24h TTL cache via shared `lib/cache.ts`
- `deduplicateGeneration()` — wraps in-flight promise sharing so concurrent identical AI calls share one request

### Latency Monitoring

`lib/latency-monitor.ts` provides:
- `monitorLatency(route, handler)` — wraps route handlers with timing instrumentation
- `reportLatency()` — logs p50/p95/p99 from the 10K-sample ring buffer
- `getLatencyStats()` — returns raw stats for dashboards

### Domain Layer

**`domains/games/`** - Quick Games flow  
- `game-ai.service.ts` - AI orchestration (article → game)
- `game-database.service.ts` - Persistence
- `image-generation.service.ts` - Multi-provider image generation
- Types in `domains/games/types.ts`

**`domains/assets/`** - Asset Marketplace  
- Asset CRUD, marketplace discovery, Story Protocol integration
- Game composition from marketplace assets

**`domains/payments/`** - Centralized payment logic (Strategy Pattern + Factory)
- `PaymentCostService` - Pricing and revenue splits
- `strategies/` - Multi-chain payment strategies
    - `writer-coin.strategy.ts` - Base Mainnet WriterCoin payments
    - `musd.strategy.ts` - Mezo Matsnet MUSD payments via Splitter contract
- `services/payment-strategy-factory.service.ts` - Singleton factory for DI: `PaymentStrategyFactory.getInstance().getStrategy(token)`

**`domains/content/`** - Article processing  
- `ContentProcessorService` - Fetching and cleaning articles

**`domains/users/`** - User management  
- Farcaster profiles, attribution, user menus

### Shared Infrastructure (`lib/`)

**`lib/wallet/`** - Unified wallet abstraction  
- `WalletProvider` interface
- Farcaster Mini App wallet + Browser wallets (RainbowKit/Wagmi)
- `detectWalletProvider()` returns unified interface
- Support for Mezo Matsnet (Chain ID 31611)

**`lib/story-protocol.service.ts`** - IP registration  
- Client-side wallet signing (no platform keys)
- PIL licenses, derivative tracking, royalty claiming

**`lib/inco.ts`** - Inco confidential compute
- On-chain encryption of secret panels (chunked) and Wordle answers via `@inco/lightning-js`
- Attested decrypt via wallet client (no WASM, no backend proxy)
- Inco fee reads from Lightning singleton (`0x4b9911b0191B0b6a6eA8F2Ed562e20Cff5AC8624`)
- Access control enforced by Inco covalidators (`e.allow(handle, nftOwner)`)

**`lib/daily-challenge.ts`** - Daily Challenge server helpers (re-exports BasePaint I/O from `lib/basepaint/`)
- Modifier deck (`lib/modifiers.json`); Inco vault session lifecycle
- Server-side modifier decrypt for AI prompts (`narrativeOperator` wallet)
- Session manager wallet client for `recordChoice` / deck shuffle

**`lib/basepaint/`** - BasePaint source layer for Daily Challenge (and Create-from-canvas)
- Day math, theme REST, GraphQL stats/strokes/balances, vision prompts, `basepaint://day/N` tagging
- See [`docs/BASEPAINT.md`](./BASEPAINT.md)

**`lib/daily-challenge-client.ts`** - Daily Challenge browser helpers
- On-chain `startSession` / `completeAndReveal` via wagmi
- Session state in localStorage (resume paid hands across tabs)

**`lib/hypercerts.service.ts`** - Impact certificates  
- AT Protocol (AtpAgent) for PDS record creation
- Activity claims with contributors, measurements

**`lib/contracts.ts`** - On-chain helpers  
- WriterCoinPayment + GameNFT via viem (Base)
- MezoPaymentSplitter configuration (Mezo)
- Uses shared `cacheGet`/`cacheSet` from `lib/cache.ts` (consolidated, no duplicate `__splitCache`)

## Data Models

```
User
├─ id, farcasterId, walletAddress (nullable)
├─ email (nullable), guestKey (nullable, unique)
├─ credits, totalCreditsPurchased
├─ isCreator, isAdmin
└─ createdAt

Game
├─ id, userId, articleUrl, title, genre, difficulty
├─ gameState (JSON), nftId (optional)
├─ secretPanelCiphertext (pre-encryption JSON; cleared after on-chain store)
├─ promptVaultUuid ("inco:<tokenId>" after mint)
├─ hypercertUri, hypercertCid
└─ createdAt

DailyChallenge
├─ id, day (unique), sourceType ("dual" | "basepaint" | …)
├─ sourceUrl (featured article when dual), basePaintDay
├─ theme, articleTitle, articleAuthor, palette, canvasUrl
└─ sessions → DailyChallengeSession

DailyChallengeSession
├─ id, challengeId, gameId, playerAddress
├─ incoSessionId (on-chain), score, rank, revealedModifierIds
└─ revealed, revealedAt

GamePlayEvent  (Resonance telemetry)
├─ id, gameId, sessionId
├─ type: 'started' | 'choice' | 'completed'
├─ panelIndex, choiceIndex, choiceText (nullable; only for 'choice')
├─ referrer, embedded
└─ playedAt

Asset
├─ id, userId, articleUrl, title
├─ assetData (JSON), type ('pack'|'character'|'mechanic'|'plot')
├─ storyIpId (optional)
└─ createdAt

WriterCoin
├─ id, name, symbol, contractAddress
└─ publicationUrl
```

## Smart Contracts

### Base Mainnet (Chain ID: 8453)

**GameNFT** (`NEXT_PUBLIC_GAME_NFT_MAINNET`)  
- ERC-721 for game NFT minting
- On-chain metadata storage
- ERC-2981 default royalties and collection `contractURI`
- Access-controlled minting through `MINTER_ROLE`

**WriterCoinPayment** (`NEXT_PUBLIC_WRITER_COIN_PAYMENT_MAINNET`)  
- Payments with configurable revenue splits
- Multi-coin support, reentrancy guards, pause control
- Pulls full mint cost, distributes shares, and refunds undistributed mint remainder

**SecretPanelVault** (`NEXT_PUBLIC_SECRET_PANEL_VAULT_ADDRESS`)  
- Base mainnet: [`0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8`](https://basescan.org/address/0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8)
- Multi-chunk encrypted secret panels + Wordle answers
- `VAULT_MANAGER_ROLE` held by server wallet (never commit private keys)

**DailyChallengeVault** (`NEXT_PUBLIC_DAILY_CHALLENGE_VAULT_ADDRESS`)  
- Base mainnet: [`0x0bb738ee11839baa44aa46984997f9417733dcce`](https://basescan.org/address/0x0bb738ee11839baa44aa46984997f9417733dcce)
- Shared shuffled modifier deck, per-player sessions, encrypted scoring
- `narrativeOperator` = server wallet (decrypts cards for AI only)

### Mezo Matsnet (Chain ID: 31611)

**MezoPaymentSplitter** (`0x32D0356f533cC429F94Db73f383bBb21a459E16b`)
- Bitcoin-backed MUSD payments for the Mezo Hackathon
- Atomic on-chain revenue splits (Platform / Writer / Creator)
- Native integration with MUSD token (`0x1189...Ac503`)

**MezoBoostedSplitter** 🆕 (`0x56Ee5A3f122da00B635DdbB319708e24450aEB89`)
- v2 with 10% creator boost for MEZO holders (≥ 1 MEZO)

**GameNFTMezo** 🆕 (`0xb6001687e4700843e0a04a442031525f669465e7`)
- Open-mint ERC-721 for minting comics directly on Mezo (no MINTER_ROLE required)
- Users pay gas only; base64 data URI tokenURIs (no IPFS)
- Compiled with Foundry + OpenZeppelin v5.6.1

### Revenue Splits (configurable per coin)

**Generation**: 60% Writer / 20% Platform / 20% Creator Pool  
**Minting**: 50% Creator / 15% Writer / 5% Platform (30% refunded to minter)

## Multi-Chain Architecture

**Base Mainnet** (Chain ID: 8453)  
- Writer Coins (ERC-20), GameNFT minting (access-controlled via MINTER_ROLE), revenue distribution
- WriterCoinPayment contract handles atomic pay + mint

**Mezo Matsnet** (Chain ID: 31611)
- MUSD payments, MEZO holder perks, Bitcoin-backed economy
- GameNFTMezo (open mint — no role check, users pay only gas)
- Mint endpoint returns chainId dynamically; frontend auto-switches before mint tx

**Story Protocol** (Chain ID: 1516 testnet)  
- IP Asset Registry, PIL licenses, royalty automation, derivative tracking

## Key Design Principles

1. **Unified API surface** - Both web app and mini-app use same endpoints
2. **Domain separation** - Quick Games vs Asset Marketplace share infrastructure
3. **Centralized payments** - All payment logic through `domains/payments`
4. **Client-side IP ownership** - Users sign Story Protocol transactions with their wallet
5. **Non-blocking enrichment** - Inco secret panel storage, image generation, and Hypercerts run async post-creation
6. **Confidentiality by Design** - Secret panels and daily modifier cards use Inco confidential compute on Base mainnet
7. **Progressive disclosure** - Entry flow avoids wallet/chain/payment on first view. Users paste a URL or marketing copy → play a game → optionally connect wallet or buy credits for on-chain actions.
8. **Progressive identity** - Users can start anonymously (guest cookie), attach an email for continuity, and later link a wallet. Identities merge automatically so games and credits survive the upgrade.
9. **Loading/Error boundaries** - Every route segment has `loading.tsx` and `error.tsx` with shimmer skeletons and contextual error cards.

## Progressive Identity

Identity is resolved from HMAC-signed cookies on every request. Three cookie types are supported:

- `wallet_session` — signed wallet address (highest precedence)
- `user_session` — signed email-verified user id (`u:<userId>`)
- `guest_session` — signed anonymous guest id (`g:<guestKey>`)

`services/auth.ts:getActor()` returns the strongest available identity. When a guest verifies an email or connects a wallet, their games, credits, and payments are merged into the canonical account and the temporary identity is deleted.

## Resonance Telemetry

Gameplay events are stored in `GamePlayEvent` for creator analytics:

- `started` — logged once per (game, session) when the player begins
- `choice` — logged when the player picks one of the panel's enumerated options
- `completed` — logged when the player finishes the 5-panel story

Events carry `sessionId` for funnel analysis, `referrer`/`embedded` for attribution, and `panelIndex`/`choiceIndex`/`choiceText` for choice-split analytics.
