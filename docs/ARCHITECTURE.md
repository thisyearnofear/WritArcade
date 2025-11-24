# WritArcade Architecture

**Last Updated:** November 24, 2025  
**Status:** Phase 5 Complete - True Feature Parity Achieved

## Overview

WritArcade is a unified platform that transforms articles into playable games, supporting both web browsers and Farcaster mini-apps with true feature parity (95% code sharing).

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

## Writer Coin Economics

### Initial Writer Coins
- **$AVC** (Fred Wilson's AVC newsletter) — `0x06FC3D5D2369561e28F28F261148576520F5e49D6ea`
- **Writer Coin #2** — TBD
- **Writer Coin #3** — TBD

### Revenue Distribution

**Game Generation** (100 tokens):
```
User pays 100 $AVC
├─ 60 $AVC → Writer's treasury
├─ 20 $AVC → WritArcade Platform  
└─ 20 $AVC → Creator/Community Pool
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
    gameGenerationCost: 100n,
    mintCost: 50n,
    decimals: 18
  }
]
```

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