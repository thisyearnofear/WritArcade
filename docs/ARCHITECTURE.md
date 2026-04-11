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
**IP**: Story Protocol (testnet) + IPFS (Pinata)  
**Access Control**: Lit Protocol (NFT-gated encryption)  
**Impact**: Hypercerts (AT Protocol impact certificates)

### Project Structure

```
writarcade/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (environment-agnostic)
│   ├── mini-app/           # Farcaster mini-app
│   └── games/              # Web app routes
├── components/             # Shared React components
├── domains/                # Business logic by domain
│   ├── games/              # Game generation & management
│   ├── assets/             # Asset creation & marketplace
│   ├── payments/           # Payment processing
│   ├── content/            # Article processing
│   └── users/              # User management
├── lib/                    # Cross-cutting infrastructure
│   ├── wallet/             # Runtime wallet abstraction
│   ├── story-protocol.*    # Story Protocol integration
│   ├── lit-protocol.*      # Lit Protocol encryption
│   ├── hypercerts.*        # Impact certificates
│   └── contracts.ts        # On-chain contract helpers
├── contracts/              # Solidity contracts
├── prisma/                 # Database schema
└── scripts/                # Operational scripts
```

### Domain Layer

**`domains/games/`** - Quick Games flow  
- `game-ai.service.ts` - AI orchestration (article → game)
- `game-database.service.ts` - Persistence
- `image-generation.service.ts` - Multi-provider image generation
- Types in `domains/games/types.ts`

**`domains/assets/`** - Asset Marketplace  
- Asset CRUD, marketplace discovery, Story Protocol integration
- Game composition from marketplace assets

**`domains/payments/`** - Centralized payment logic  
- `PaymentCostService` - Pricing and revenue splits
- Payment initiation/verification

**`domains/content/`** - Article processing  
- `ContentProcessorService` - Fetching and cleaning articles

**`domains/users/`** - User management  
- Farcaster profiles, attribution, user menus

### Shared Infrastructure (`lib/`)

**`lib/wallet/`** - Unified wallet abstraction  
- `WalletProvider` interface
- Farcaster Mini App wallet + Browser wallets (RainbowKit/Wagmi)
- `detectWalletProvider()` returns unified interface

**`lib/story-protocol.service.ts`** - IP registration  
- Client-side wallet signing (no platform keys)
- PIL licenses, derivative tracking, royalty claiming

**`lib/lit-protocol.service.ts`** - Decentralized encryption  
- ERC721 ownership check on Base
- Server-side encryption, client-side decryption

**`lib/hypercerts.service.ts`** - Impact certificates  
- AT Protocol (AtpAgent) for PDS record creation
- Activity claims with contributors, measurements

**`lib/contracts.ts`** - On-chain helpers  
- WriterCoinPayment + GameNFT via viem

## Data Models

```
User
├─ id, farcasterId, walletAddress
├─ isCreator, isAdmin
└─ createdAt

Game
├─ id, userId, articleUrl, title, genre, difficulty
├─ gameState (JSON), nftId (optional)
├─ secretPanelCiphertext, secretPanelDataHash
├─ hypercertUri, hypercertCid
└─ createdAt

Asset
├─ id, userId, articleUrl, title
├─ assetData (JSON), type ('pack'|'character'|'mechanic'|'plot')
├─ storyIpId (optional)
└─ createdAt

WriterCoin
├─ id, name, symbol, contractAddress
└─ publicationUrl
```

## Smart Contracts (Base Mainnet)

**GameNFT** (`0x778C87dAA2b284982765688AE22832AADae7dccC`)  
- ERC-721 for game NFT minting
- On-chain metadata storage

**WriterCoinPayment** (`0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75`)  
- Payments with configurable revenue splits
- Multi-coin support, reentrancy guards

### Revenue Splits (configurable per coin)

**Generation**: 60% Writer / 20% Platform / 20% Creator Pool  
**Minting**: 30% Creator / 15% Writer / 5% Platform (remainder to payer)

## Dual-Chain Architecture

**Base Mainnet** (Chain ID: 8453)  
- Writer Coins (ERC-20), GameNFT minting, revenue distribution

**Story Protocol** (Chain ID: 1516 testnet)  
- IP Asset Registry, PIL licenses, royalty automation, derivative tracking

## Key Design Principles

1. **Unified API surface** - Both web app and mini-app use same endpoints
2. **Domain separation** - Quick Games vs Asset Marketplace share infrastructure
3. **Centralized payments** - All payment logic through `domains/payments`
4. **Client-side IP ownership** - Users sign Story Protocol transactions with their wallet
5. **Non-blocking enrichment** - Lit Protocol encryption and Hypercerts run async post-creation
