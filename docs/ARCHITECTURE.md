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
**IP**: Story Protocol (testnet) + IPFS (Pinata) + **Story CDR (TEE-backed confidentiality)**
**Access Control**: Story CDR token-gated vaults for secret panels; Lit Protocol remains legacy support
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
│   ├── payments/           # Payment processing (Strategy Pattern)
│   ├── content/            # Article processing
│   └── users/              # User management
├── hooks/                  # Custom React hooks
│   └── useMezoBalance.ts   # On-chain MEZO balance detection
├── lib/                    # Cross-cutting infrastructure
│   ├── wallet/             # Runtime wallet abstraction
│   ├── story-protocol.*    # Story Protocol integration
│   ├── lit-protocol.*      # Legacy Lit Protocol encryption
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

**`domains/payments/`** - Centralized payment logic (Strategy Pattern)
- `PaymentCostService` - Pricing and revenue splits
- `strategies/` - Multi-chain payment strategies
    - `writer-coin.strategy.ts` - Base Mainnet WriterCoin payments
    - `musd.strategy.ts` - Mezo Matsnet MUSD payments via Splitter contract

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

**`lib/lit-protocol.service.ts`** - Decentralized encryption  
- ERC721 ownership check on Base
- Server-side encryption, client-side decryption

**`domains/story/services/cdr.service.ts`** - Confidential Data Rails
- Platform client vaults secret epilogues and Wordle answers on Story Aeneid
- User client decrypts vaulted data from the browser with wallet-backed CDR access
- Secret panel read conditions use CDR `tokenGate` against the configured Game NFT contract
- Runtime unlock additionally verifies exact minted NFT ownership and completed 5-panel gameplay

**`lib/hypercerts.service.ts`** - Impact certificates  
- AT Protocol (AtpAgent) for PDS record creation
- Activity claims with contributors, measurements

**`lib/contracts.ts`** - On-chain helpers  
- WriterCoinPayment + GameNFT via viem (Base)
- MezoPaymentSplitter configuration (Mezo)

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

## Smart Contracts

### Base Mainnet (Chain ID: 8453)

**GameNFT** (`0x778C87dAA2b284982765688AE22832AADae7dccC`)  
- ERC-721 for game NFT minting
- On-chain metadata storage

**WriterCoinPayment** (`0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75`)  
- Payments with configurable revenue splits
- Multi-coin support, reentrancy guards

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
**Minting**: 30% Creator / 15% Writer / 5% Platform (remainder to payer)

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
5. **Non-blocking enrichment** - Lit Protocol encryption and Hypercerts run async post-creation
6. **Confidentiality by Design** - Transitioning to TEE-backed vaults (CDR) to protect **Prompt IP** and **Trade Secrets**. Ensures creator "prompts" are treated as valuable, private intellectual property rather than public metadata.
