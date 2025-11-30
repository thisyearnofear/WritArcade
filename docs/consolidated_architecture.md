# WritArcade Architecture

**Last Updated:** November 30, 2025
**Status:** Phase 5 Complete - Phase 6 Sprint 1-4 Complete (Asset Marketplace)

## Overview

WritArcade is a **dual-product platform** that transforms articles into engaging content in two ways:

1. **Quick Games** (MVP - Live): Article → AI-generated complete game → Play in 2 minutes
2. **Asset Marketplace** (Phase 6): Article → Reusable game components → Collaborative game building

Both share the same codebase while maintaining **complete architectural separation** to minimize risk and maximize flexibility.

## Unified Architecture

### Core Design Principles

#### **Single Source of Truth**
- Unified endpoints for all functionality
- Same business logic for both web + mini-app
- Shared payment and wallet abstraction

#### **Privacy by Design**
- No PII storage, users control their data
- Blockchain-based verification
- GDPR-friendly architecture

#### **Wallet Abstraction**
```typescript
// Same interface for both environments
interface WalletProvider {
  getAddress(): Promise<string>
  sendTransaction(request: TransactionRequest): Promise<TransactionResult>
  getChainId(): Promise<number>
}

// Runtime detection
const wallet = detectWalletProvider() // Farcaster or Browser
```

## Dual-Product System Design

### Product Separation (Clean Boundaries)

```
WritArcade Codebase
│
├─ PRODUCT 1: Quick Games (100% Complete ✅)
│  └─ Unified web + mini-app experience
│     ├─ Article input
│     ├─ Genre/difficulty customization
│     ├─ AI game generation
│     ├─ 5-panel interactive gameplay
│     ├─ Base blockchain payments
│     └─ NFT minting (optional)
│
├─ PRODUCT 2: Asset Marketplace (Phase 6 🆕)
│  └─ Collaborative asset creation
│     ├─ Article → component extraction
│     ├─ Asset discovery & browsing
│     ├─ Game builder (compose assets)
│     ├─ Story Protocol IP registration
│     └─ Revenue sharing (per derivative)
│
└─ Shared Infrastructure (Both Products)
   ├─ Authentication & user management
   ├─ Article processing (ContentProcessorService)
   ├─ AI services (GameAIService patterns)
   ├─ Image generation (ImageGenerationService)
   └─ Database (Prisma, PostgreSQL)
```

### Why This Architecture?

| Benefit | Why It Matters |
|---------|---|
| **Zero Risk** | Product 1 is completely untouched; Product 2 is isolated |
| **Independent Validation** | Each product can fail without affecting the other |
| **Flexible Story Integration** | Story Protocol only for assets (where it fits) |
| **Code Reuse** | Shared AI, content processing, auth |
| **User Clarity** | Two distinct value propositions, different UX |

---

## Building Asset Marketplace with Core Principles

### Applying ENHANCEMENT FIRST (Reuse Existing Services)

**❌ Wrong Approach:** Create new AI services, duplicate prompts, duplicate image generation
**✅ Right Approach:** Extend existing services for asset generation

```typescript
// domains/games/services/game-ai.service.ts (ENHANCED)
export class GameAIService {
  // Existing methods
  static async generateGame(request: GameGenerationRequest): Promise<GameGenerationResponse>
  static async startGame(request: GameStartRequest): Promise<GameplayResponse>
  static async chatGame(request: GameChatRequest): Promise<GameplayResponse>
  
  // NEW: Asset generation (same schema, different prompt)
  static async generateAssets(request: AssetGenerationRequest): Promise<AssetGenerationResponse>
}

// Reuses:
// - Same model provider logic (getModel function)
// - Same error handling + retry logic
// - Same prompt structure (with asset-specific directives)
// - Same Zod schema validation pattern
```

**Implementation:**
- Add `AssetGenerationRequest` type to `domains/games/types.ts`
- Add `generateAssets()` method to existing `GameAIService`
- No new AI service class needed

---

### Applying AGGRESSIVE CONSOLIDATION (No Code Duplication)

**Asset-Specific Code (Only):**
```typescript
// domains/assets/services/ (MINIMAL)
├─ asset-database.service.ts     // Asset CRUD only
├─ asset-marketplace.service.ts  // Discovery/search logic
└─ story-protocol.service.ts     // Story registration only (4 methods)
```

**Shared (Don't Duplicate):**
```typescript
// REUSE these services:
domains/games/services/game-ai.service.ts          // generateAssets()
domains/games/services/image-generation.service.ts // generateAssetImage()
domains/content/services/content-processor.service.ts // extractArticleContent()
lib/wallet/                                        // Wallet abstraction
lib/database.ts                                    // Prisma client
```

**Prisma Models (Strategic Addition):**
```prisma
// Add to schema.prisma (only 3 models)
model Asset {
  id String @id @default(cuid())
  // ... (minimal fields, reuse Game relationships)
}

model GameFromAsset {
  id String @id @default(cuid())
  // ... (extends Game, tracks asset origins)
}

model AssetRevenue {
  id String @id @default(cuid())
  // ... (tracks creator earnings)
}
```

---

### Applying PREVENT BLOAT (Shared Infrastructure)

**Database:** Extend existing schema, don't create new tables unless essential
```prisma
// Add to existing Game model
model Game {
  id String @id
  // ... existing fields ...
  
  // NEW: Link to source assets (if game built from assets)
  sourceAssets Asset[] @relation("GameSourceAssets")
  isFromAssets Boolean @default(false)
}

// Add these 3 new models only
model Asset { ... }
model GameFromAsset { ... }
model AssetRevenue { ... }
```

**Authentication:** Reuse existing user context
- No new auth needed; assets belong to users same as games
- Use existing `userId` context from requests

**Image Generation:** Reuse `ImageGenerationService`
- Asset images use same Venice AI pipeline
- Same caching strategy
- Same rating system for model feedback

---

### Applying DRY (Single Source of Truth)

**Asset Generation Prompt:**
```typescript
// domains/games/services/game-ai.service.ts
static buildAssetGenerationPrompt(articleContent: string, genre?: string): string {
  // Single prompt for all asset generation
  // Genre parameter optional (asset generation is less genre-dependent)
  // Outputs structured JSON with: characters, mechanics, storyBeats, visualGuidelines
}

// Reuses prompt building patterns from generateGame()
// Same constraint validation as game generation
```

**Asset Composition:**
```typescript
// domains/assets/services/asset-marketplace.service.ts
static async composeGameFromAssets(
  assetIds: string[],
  customization?: GameCustomization
): Promise<Game> {
  // Single method to turn multiple assets into a complete game
  // Reuses existing GameAIService methods (startGame, chatGame)
  // Single database transaction
}
```

---

### Applying CLEAN (Clear Dependencies)

**Explicit Dependency Graph:**
```
Asset Marketplace
├─ AssetDatabaseService (asset storage)
│  └─ Prisma (database)
├─ AssetMarketplaceService (discovery)
│  ├─ AssetDatabaseService
│  └─ GameAIService (to verify compatibility)
├─ StoryProtocolService (assets only)
│  └─ Asset IP registration
└─ GameAIService (to generate assets)
   ├─ ImageGenerationService (images)
   └─ Anthropic/OpenAI (API)

Game Builder
├─ GameAIService (existing, unchanged)
├─ AssetDatabaseService (read-only)
└─ GameDatabaseService (write game)
```

**No Circular Dependencies:**
- Assets don't know about games
- Games reference assets but don't modify them
- Story service is optional layer on top

---

### Applying MODULAR (Testable Pieces)

**Each Service is Independently Testable:**

```typescript
// Test AssetDatabaseService without touching games
describe('AssetDatabaseService', () => {
  it('creates asset with proper fields')
  it('retrieves asset by ID')
  it('lists user assets')
})

// Test asset generation without hitting Story Protocol
describe('GameAIService.generateAssets', () => {
  it('generates valid asset structure')
  it('includes all required components')
  it('respects genre constraints')
})

// Test marketplace without touching blockchain
describe('AssetMarketplaceService', () => {
  it('discovers public assets')
  it('filters by genre')
  it('ranks by popularity')
})

// Test game builder without Story Protocol
describe('GameBuilder', () => {
  it('composes game from asset sources')
  it('tracks derivative origin')
  it('preserves asset creator attribution')
})
```

---

### Applying PERFORMANT (Smart Caching)

**Asset Discovery (Cache Everything):**
```typescript
// AssetMarketplaceService with caching
private static assetCache = new Map<string, Asset[]>()
private static cacheExpiry = 5 * 60 * 1000 // 5 minutes

static async getAssetsByGenre(genre: string): Promise<Asset[]> {
  const cacheKey = `genre:${genre}`
  
  // Check cache first
  if (this.assetCache.has(cacheKey)) {
    return this.assetCache.get(cacheKey)!
  }
  
  // Fetch from database
  const assets = await prisma.asset.findMany({ where: { genre } })
  
  // Cache result
  this.assetCache.set(cacheKey, assets)
  
  // Auto-expire
  setTimeout(() => this.assetCache.delete(cacheKey), cacheExpiry)
  
  return assets
}
```

**Asset Image Generation (Parallel + Progressive):**
```typescript
// Generate asset images in parallel with composition
async function buildAssetImages(assetIds: string[]): Promise<string[]> {
  // Don't wait for all—return as they complete
  // Same pattern as GamePlayInterface image loading
  return Promise.allSettled(
    assetIds.map(id => ImageGenerationService.generateAssetImage(id))
  )
}
```

---

### Applying ORGANIZED (Domain Structure)

**File Structure (Minimal, Clear Hierarchy):**
```
domains/
├─ games/                    (UNCHANGED)
│  ├─ components/
│  ├─ services/
│  │  ├─ game-ai.service.ts         (ENHANCED: +generateAssets)
│  │  ├─ game-database.service.ts   (unchanged)
│  │  └─ image-generation.service.ts (unchanged)
│  ├─ types.ts                       (ENHANCED: +Asset types)
│  └─ utils/
│
├─ assets/                   (NEW DOMAIN - MINIMAL)
│  ├─ services/
│  │  ├─ asset-database.service.ts      (CRUD only)
│  │  ├─ asset-marketplace.service.ts   (discovery)
│  │  └─ story-protocol.service.ts      (IP registration)
│  ├─ types.ts                          (Asset-specific types)
│  └─ components/                       (UI only—not services!)
│
├─ content/                  (unchanged)
├─ payments/                 (unchanged)
└─ users/                    (unchanged)

app/
├─ api/
│  ├─ games/                 (UNCHANGED)
│  ├─ assets/                (NEW ENDPOINTS)
│  │  ├─ generate/route.ts       (POST: article → assets)
│  │  ├─ [id]/route.ts           (GET: asset details)
│  │  └─ build-game/route.ts     (POST: assets → game)
│  └─ payments/              (unchanged)
│
└─ assets/                   (NEW PAGES - UI ONLY)
   ├─ page.tsx              (marketplace discover)
   ├─ [id]/page.tsx         (asset detail)
   └─ create/page.tsx       (generate from article)
```

**Why This Structure Works:**
- ✅ Assets domain mirrors games domain (parallel, not nested)
- ✅ Clear service boundaries (database, marketplace, blockchain)
- ✅ UI lives in `app/`, never in `domains/`
- ✅ Shared services are reused, not duplicated
- ✅ Easy to delete entire `domains/assets/` if feature flops

---

## Summary: Asset Marketplace Implementation Rules

| Principle | Action |
|-----------|--------|
| **ENHANCEMENT FIRST** | Add `generateAssets()` to `GameAIService`, don't create new class |
| **AGGRESSIVE CONSOLIDATION** | Reuse `ImageGenerationService`, `ContentProcessor`, `GameAIService` |
| **PREVENT BLOAT** | Only 3 new Prisma models, reuse Game model where possible |
| **DRY** | Single asset composition method, single prompt builder |
| **CLEAN** | Clear dependency graph, no circular refs, explicit imports |
| **MODULAR** | Each service testable independently, UI separate from logic |
| **PERFORMANT** | Cache asset discovery, parallel image generation |
| **ORGANIZED** | Parallel domain structure, UI in `app/`, logic in `domains/` |

---

## Quick Start: Asset Marketplace Sprint 1

**Goal:** Generate and store assets locally (no Story Protocol)

### Step 1: Extend GameAIService (30 min)
```typescript
// domains/games/types.ts - ADD
export interface AssetGenerationRequest {
  url?: string
  promptText?: string
  genre?: 'horror' | 'comedy' | 'mystery'
  model?: string
}

export interface AssetGenerationResponse {
  characters: Character[]
  storyBeats: StoryBeat[]
  gameMechanics: GameMechanic[]
  visualGuidelines: VisualGuideline
}

// domains/games/services/game-ai.service.ts - ADD METHOD
static async generateAssets(
  request: AssetGenerationRequest
): Promise<AssetGenerationResponse> {
  const model = getModel(request.model || 'gpt-4o-mini')
  const prompt = this.buildAssetGenerationPrompt(request.promptText, request.genre)
  
  const { object: assets } = await generateObject({
    model,
    schema: assetGenerationSchema,
    prompt,
  })
  
  return assets
}

static buildAssetGenerationPrompt(content: string, genre?: string): string {
  // Reuse buildGenerationPrompt pattern
  // Output structured asset components
}
```

### Step 2: Create Asset Database Service (45 min)
```typescript
// domains/assets/services/asset-database.service.ts
export class AssetDatabaseService {
  static async createAsset(
    userId: string,
    data: AssetCreateInput
  ): Promise<Asset> {
    return prisma.asset.create({
      data: {
        ...data,
        creatorId: userId,
      },
    })
  }
  
  static async getAsset(id: string): Promise<Asset | null> {
    return prisma.asset.findUnique({ where: { id } })
  }
  
  static async listUserAssets(userId: string): Promise<Asset[]> {
    return prisma.asset.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
    })
  }
}
```

### Step 3: Add Prisma Models (30 min)
```prisma
// prisma/schema.prisma - ADD

model Asset {
  id            String   @id @default(cuid())
  
  // Source
  articleUrl    String
  creatorId     String
  creator       User     @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  
  // Content
  characters    Json     // Array of character objects
  storyBeats    Json     // Array of story beat objects
  gameMechanics Json     // Array of mechanic objects
  visualGuidelines Json  // Visual direction object
  
  // Metadata
  genre         String?
  title         String
  description   String?
  thumbnail     String?  // Generated image of first character
  
  // Relations
  games         GameFromAsset[] @relation("AssetToGameFromAsset")
  revenues      AssetRevenue[]
  
  // Story Protocol (added in Sprint 4)
  storyIPAssetId String?
  licenseTermsId Int?
  
  isPublic      Boolean  @default(true)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model GameFromAsset {
  id            String   @id @default(cuid())
  
  // Composition
  assetIds      String[] // IDs of source assets
  assets        Asset[]  @relation("AssetToGameFromAsset")
  
  // The actual game (extend Game)
  game          Game?    @relation(fields: [gameId], references: [id], onDelete: Cascade)
  gameId        String?  @unique
  
  creatorId     String
  creator       User     @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  
  // Story Protocol (added in Sprint 4)
  storyIPAssetId String?
  parentIPIds   String[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model AssetRevenue {
  id            String   @id @default(cuid())
  
  assetId       String
  asset         Asset    @relation(fields: [assetId], references: [id], onDelete: Cascade)
  
  gameFromAssetId String
  gameFromAsset GameFromAsset @relation(fields: [gameFromAssetId], references: [id], onDelete: Cascade)
  
  creatorWallet String
  royaltyPercent Int     // Basis points (1500 = 15%)
  totalEarned   BigInt  @default(0)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// Extend existing Game model
model Game {
  // ... existing fields ...
  
  // NEW: Link to source assets
  sourceAssets  GameFromAsset[]
  isFromAssets  Boolean @default(false)
}

// Extend existing User model
model User {
  // ... existing fields ...
  
  // NEW: Assets and games from assets
  assets        Asset[]
  gamesFromAssets GameFromAsset[]
  assetRevenues AssetRevenue[]
}
```

### Step 4: Create API Route (30 min)
```typescript
// app/api/assets/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GameAIService } from '@/domains/games/services/game-ai.service'
import { AssetDatabaseService } from '@/domains/assets/services/asset-database.service'

export async function POST(request: NextRequest) {
  try {
    const { url, promptText, genre, model } = await request.json()
    
    // Get article content if URL provided
    let content = promptText
    if (url) {
      // Use existing ContentProcessorService
      content = await ContentProcessorService.extractContent(url)
    }
    
    // Generate assets using ENHANCED GameAIService
    const assets = await GameAIService.generateAssets({
      promptText: content,
      genre,
      model,
    })
    
    // Store in database
    const asset = await AssetDatabaseService.createAsset(
      userId, // from auth context
      {
        title: assets.title || 'Untitled Asset Pack',
        description: assets.description,
        characters: assets.characters,
        storyBeats: assets.storyBeats,
        gameMechanics: assets.gameMechanics,
        visualGuidelines: assets.visualGuidelines,
        genre,
        articleUrl: url,
      }
    )
    
    return NextResponse.json({ success: true, asset })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Step 5: Run & Test (15 min)
```bash
# Create migrations
npx prisma migrate dev --name add_assets

# Test locally
npm run dev
# POST http://localhost:3000/api/assets/generate
# {
#   "url": "https://avc.xyz/blog/...",
#   "genre": "horror"
# }
```

**Total Sprint 1 Time:** ~2 hours of actual coding
**Result:** Assets can be generated from articles and stored in database

### What NOT to Do
- ❌ Don't create new image generation service (reuse ImageGenerationService)
- ❌ Don't create new AI provider (reuse getModel function)
- ❌ Don't duplicate error handling (reuse existing patterns)
- ❌ Don't add fields to Asset model until needed

### What To Do
- ✅ Enhance existing GameAIService with one new method
- ✅ Create minimal database service (just CRUD)
- ✅ Add 3 Prisma models (no more)
- ✅ Test locally before moving to Sprint 2

---

## Unified System Architecture

### Wallet Abstraction Layer (`/lib/wallet/`)

**Single interface for all wallet types:**
```typescript
/lib/wallet/
├── types.ts          → WalletProvider interface
├── farcaster.ts      → Farcaster Mini App SDK implementation
├── browser.ts        → MetaMask/browser wallet implementation
└── index.ts          → Auto-detection + factory
```

**Benefits:**
- Runtime environment detection (Farcaster vs browser)
- Identical API for both wallet types
- Transaction abstraction: `sendTransaction()` works everywhere
- No code duplication

### Shared Payment Domain (`/domains/payments/`)

**Single source of truth for all payment logic:**
```typescript
/domains/payments/
├── types.ts                         → Payment types
└── services/payment-cost.service.ts → Unified cost calculations
```

**Key Features:**
- `PaymentCostService.calculateCost()`: get amount for any action + writer coin
- Revenue distribution calculations (writer/platform/creator)
- Game generation: 60% writer, 20% platform, 20% creator
- NFT minting: 30% creator, 15% writer, 5% platform

### Shared UI Components (`/components/game/`)

**Reusable across both environments:**
```typescript
/components/game/
├── GenreSelector.tsx       → 'horror' | 'comedy' | 'mystery'
├── DifficultySelector.tsx  → 'easy' | 'hard'
├── CostPreview.tsx         → Revenue breakdown display
├── PaymentFlow.tsx         → Wallet-agnostic payment handler
├── PaymentOption.tsx       → Web app payment wrapper
└── WalletConnectButton.tsx → Browser wallet connection
```

## Unified Endpoints

**Before (duplicated):**
```
Mini-app:  /api/mini-app/payments/initiate
Web app:   (no payment support)

Mini-app:  /api/mini-app/games/generate
Web app:   /api/games/generate (different)
```

**After (unified):**
```
/api/games/generate      → Both environments
/api/payments/initiate   → Both environments
/api/payments/verify     → Both environments
```

**Smart Design:**
- Optional `customization` parameter (web app sends undefined)
- Optional `payment` info (mini-app required, web app optional)
- Same response format for both

## Database Purpose

### Game Data Storage
- **Generated Games**: AI-generated game metadata (title, description, prompts)
- **Game Sessions**: Persistent gameplay across visits
- **Chat History**: Full conversation threads for each game
- **Game Assets**: Generated images, music, custom prompts

### Payment Tracking
- **Payment Records**: Writer coin transactions for game generation
- **NFT Metadata**: Game minting information
- **Revenue Tracking**: Creator royalty distribution
- **Audit Trail**: Complete transaction history

### Session Management
- **Anonymous Sessions**: Games work without wallet connection
- **Wallet Sessions**: Link sessions to wallet addresses when connected
- **Cross-Device Continuity**: Resume games on different devices

## Database Schema (Consolidated)

```prisma
model User {
  id            String   @id
  walletAddress String   @unique
  preferredModel String  @default("gpt-4o-mini")
  private        Boolean @default(false)
  payments       Payment[]
  games          Game[]
}

model Game {
  id               String   @id @default(cuid())
  title            String
  articleUrl       String?
  genre            String?   // "horror" | "comedy" | "mystery"
  difficulty       String?   // "easy" | "hard"
  content          Json      // Full game JSON
  writerCoinId     String?   // Token used for generation
  creatorId        String?
  createdAt        DateTime  @default(now())
  nftTokenId       String?   // ERC-721 token ID
  nftTransactionHash String? // Mint tx hash
  nftMintedAt      DateTime? // When NFT was minted
  paymentId        String?   // Link to Payment record

  creator          User?     @relation(fields: [creatorId], references: [id])
  payment          Payment?  @relation(fields: [paymentId], references: [id])
}

model Payment {
  id               String    @id @default(cuid())
  transactionHash  String    @unique
  action           String    // 'generate-game' | 'mint-nft'
  amount           BigInt
  status           String    @default("pending") // 'pending' | 'verified' | 'failed'
  userId           String?
  writerCoinId     String    // Token used
  createdAt        DateTime  @default(now())
  verifiedAt       DateTime?

  user             User?     @relation(fields: [userId], references: [id])
  games            Game[]    // Games linked to this payment
}
```

## Writer Coin Economics: Collaboration Revenue Model

### Collaborative Content Monetization
WritArcade creates sustainable revenue streams through a three-way collaboration between writers, game creators, and the platform. Using automated 0xSplits and Story Protocol IP management, every transaction benefits all stakeholders.

### $AVC (Fred Wilson) - Partnership Model
- **Paragraph Publication**: https://avc.xyz/ (Fred Wilson's newsletter)
- **Token Address**: `0x06FC3D5D2369561e28F28F261148576520F5e49D6ea`
- **Collaboration Framework**: Readers transform Fred's content into games, creating new value from existing articles
- **Writer Coin #2** — TBD
- **Writer Coin #3** — TBD

### Revenue Distribution

**Game Generation** (100 tokens):
```
User pays 100 $AVC
├─ 35 $AVC → Writer's treasury
├─ 35 $AVC → Game Creator
├─ 20 $AVC → Token Burn (deflationary)
└─ 10 $AVC → WritArcade Platform
```

**NFT Minting** (50 tokens):
```
User pays 50 $AVC
├─ 30 $AVC → Game Creator
├─ 15 $AVC → Writer's treasury
├─ 5 $AVC → WritArcade Platform
└─ 0 $AVC → User (cost accounted)
```

### Writer Coin Configuration

```typescript
// lib/writerCoins.ts
const WRITER_COINS = [
  {
    id: "avc",
    name: "AVC",
    symbol: "$AVC",
    address: "0x06FC3D5D2369561e28F28F261148576520F5e49D6ea",
    writer: "Fred Wilson",
    paragraphAuthor: "fredwilson",
    paragraphUrl: "https://avc.xyz/",
    gameGenerationCost: 100n,
    mintCost: 50n,
    decimals: 18,
    revenueDistribution: {
      writer: 35,      // Fred Wilson's collaboration revenue
      creator: 35,     // Game creator ongoing revenue
      burn: 20,        // Token burn (deflationary mechanism)
      platform: 10     // WritArcade sustainability
    }
  }
]
```

### Revenue Automation Framework

**0xSplits Integration** (Planned):
- Automated revenue distribution using 0xSplits contracts
- Real-time settlement to writer, creator, and platform treasuries
- Transparent on-chain revenue tracking
- Optional burn mechanism for deflationary tokenomics

**Story Protocol IP Layer** (Phase 6):
- Every generated game registered as IP Asset derived from original article
- Automated royalty collection for writers on derivative works
- IP attribution linking games back to Paragraph articles
- Protection against unauthorized commercial use while enabling creative derivatives

## Smart Contracts (Base Mainnet)

### Deployed Contracts
- **GameNFT**: `0x2b440Ee81A783E41eec5dEfFB2D1Daa6E35bCC34`
- **WriterCoinPayment**: `0x786AC70DAf4d9779B93EC2DE244cBA66a2b44B80`

### WriterCoinPayment.sol
```solidity
contract WriterCoinPayment {
  mapping(address => bool) public allowedWriterCoins;

  function payForGameGeneration(
    address writerCoin,
    address user
  ) external returns (uint256 paymentId);

  function payForMinting(
    address writerCoin,
    address user
  ) external returns (uint256 paymentId);
}
```

### GameNFT.sol
```solidity
contract GameNFT is ERC721URIStorage {
  struct GameMetadata {
    string articleUrl;
    address creator;
    address writerCoin;
    string genre;
    string difficulty;
    uint256 createdAt;
  }

  mapping(uint256 => GameMetadata) public games;

  function mintGame(
    address to,
    string memory tokenURI,
    GameMetadata memory metadata
  ) external returns (uint256 tokenId);
}
```

## Tech Stack

### Frontend Stack
- **Mini App Framework**: `@farcaster/miniapp-sdk` (November 2025 standard)
- **Framework**: Next.js 16 + TypeScript
- **Styling**: TailwindCSS
- **Browser Wallets**: RainbowKit + Wagmi (MetaMask, Coinbase, WalletConnect)

### Backend Stack
- **API**: Next.js API routes (unified endpoints)
- **Database**: PostgreSQL + Prisma ORM
- **Game Generation**: Infinity Arcade pipeline + OpenAI
- **Blockchain**: Base mainnet via viem

### Unified Architecture Benefits
- **Wallet**: Abstraction layer (`/lib/wallet/`)
- **Payments**: Shared service (`/domains/payments/`)
- **UI**: Reusable components (`/components/game/`)
- **Endpoints**: Unified for both environments

## Game Flow Architecture

```
WritArcade Unified Flow:
┌─────────────────────────────────┐
│ User opens Web App or Mini App  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Step 1: Input Content           │
│ - Web: URL or text              │
│ - Mini: Writer Coin + URL       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Step 2: Customize Game (Optional)│
│ - Genre (Horror/Comedy/Mystery) │
│ - Difficulty (Easy/Hard)        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Step 3: Payment (if customized) │
│ - Web: MetaMask/Coinbase        │
│ - Mini: Farcaster Wallet        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Step 4: Generate & Play         │
│ - Same AI generation pipeline   │
│ - Play in environment           │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Step 5: Mint as NFT (Optional)  │
│ - Same payment + mint process   │
│ - Share on respective platform  │
└─────────────────────────────────┘
```

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/writarcade"

# API Keys
OPENAI_API_KEY="sk-..."
NEYNAR_API_KEY="your-key"

# Blockchain
BASE_RPC_URL="https://mainnet.base.org"
NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS="0x786AC70DAf4d9779B93EC2DE244cBA66a2b44B80"
NEXT_PUBLIC_GAME_NFT_ADDRESS="0x2b440Ee81A783E41eec5dEfFB2D1Daa6E35bCC34"

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-project-id"
```

## Benefits of Unified Architecture

1. **For Users**
   - Consistent experience across platforms
   - Same payment costs and logic
   - Feature parity (web = mini-app functionality)

2. **For Developers**
   - 95% code sharing between environments
   - Single source of truth for business logic
   - Easier testing and maintenance

3. **For the Business**
    - Reduced technical debt
    - Unified analytics and metrics
    - Faster feature development across platforms

## Content Processing (Paragraph Integration)

### Supported Sources
- **Paragraph Newsletters** (primary integration)
- Substack articles
- Medium posts
- Dev.to articles
- Blog URLs

### Game Generation Pipeline

**AI Implementation:**
- **Models**: GPT-4o-mini (default), Claude-3, auto-fallback system
- **Structured Output**: JSON schema validation (Zod) for consistent format
- **Streaming**: Real-time text generation with automatic option parsing
- **Quality Control**: Auto-retry on genre mismatch, option parsing validation

**Content Flow:**
```
1. User submits Paragraph.xyz URL
   ↓
2. ContentProcessorService.processUrl() → Extract & clean content
   ↓
3. GameAIService.generateGame() → AI creates structured game JSON
   ↓
4. Quality validation → Auto-retry if genre mismatch detected
   ↓
5. GameAIService.startGame() → Interactive streaming gameplay
   ↓
6. Option parsing → Automatic detection of numbered choices (1. 2. 3. 4.)
```

**Error Handling & Reliability:**
- Graceful AI model fallback (OpenAI → Claude → retry)
- Stream parsing handles partial responses and connection issues
- Genre validation ensures customization requests are respected
- Article context integration guarantees games reference source material

### Key Functions
- `ContentProcessorService.processUrl()` - Extract and clean content
- `processArticleFromUrl()` - Paragraph SDK wrapper
- `getPublicationSubscriberCount()` - Get publication metrics

### Error Handling
- Invalid URLs → User-friendly messages
- Unsupported sources → List supported platforms
- Timeouts → Suggest retrying or pasting text directly
- 404s → Indicate URL doesn't exist