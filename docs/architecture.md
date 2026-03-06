# writersarcade Architecture

**Last Updated:** March 6, 2026
**Status:** Phase 9 - Production Ready (Base Batches submission)

## Overview

writersarcade is a **dual-loop platform** designed to maximize the value of content:

1.  **The Attention Loop (Base Chain)**:
    *   **User Action**: "I like this article. Generate a game."
    *   **Value**: Immediate engagement, fun, writer attribution.
    *   **Tech**: AI Content Decomposer + Quick Game Engine.
    *   **Status**: Live & Mature.

2.  **The IP Loop (Story Protocol)**:
    *   **User Action**: "I want to own this Character. I'll mint it."
    *   **Value**: Permanent asset ownership, composability, future royalties.
    *   **Tech**: Asset Workshop + Story Protocol IP Registry.
    *   **Status**: Live (Hackathon Beta).

Both loops share the same codebase but serve different user needs: *Consumption* vs. *Creation*.

## Unified Architecture

### Core Design Principles

#### **Single Source of Truth**
- `Asset` model in Database serves both "Drafts" (off-chain) and "Registered IP" (on-chain).
- Middleware determines if an asset is "Local" or "Story-backed".

#### **Aggressive Consolidation**
- We avoided creating separate `MarketplaceItem` and `UserAsset` tables.
- A single `Asset` table handles:
  - `type: 'pack'` (Collections of assets)
  - `type: 'character'` (Individual atomic assets)
  - `storyIpId` (The on-chain link)

## Dual-Product System Design

### Asset Marketplace Architecture (The "Workshop")

The Workshop is the bridge between *Reading* and *Owning*.

```
Article URL
  │
  ▼
Decomposition Engine (AI)
  │── Extracts Characters (Profiles, Motivations)
  │── Extracts Mechanics (Rules, Items)
  │── Extracts World (Setting, Visuals)
  │
  ▼
Workshop UI (The Editor)
  │── User edits/refines extracted assets
  │── User injects "Community Assets" (Marketplace Sidebar)
  │── User SAVES Draft (Database Persistence)
  │
  ▼
Minting Pipeline (Story Protocol)
  │── Hashing: Creates content hash of the Asset JSON
  │── Storage: Uploads IP Metadata + NFT Metadata to IPFS
  │── Registration: Calls Story Protocol SDK (SPG) to Mint IP
  │
  ▼
Game Compilation
  │── The Final Game is registered as a DERIVATIVE of the Assets
  │── Royalties flow to original Asset Creators
```

## Technology Stack

### Frontend
- **Mini App**: `@farcaster/miniapp-sdk` (November 2025 standard)
- **Web App**: Next.js 16 + TypeScript + TailwindCSS
- **State Management**: React Context + Custom Hooks
- **Styling**: TailwindCSS with custom design system

### Backend
- **API**: Next.js API routes
- **Database**: PostgreSQL + Prisma ORM
- **Game Generation**: Infinity Arcade pipeline + OpenAI
- **Caching**: Redis for frequently accessed data
- **Queuing**: BullMQ for background jobs

### Blockchain
- **Primary Network**: Base mainnet
- **Secondary Network**: Story Protocol testnet
- **Contracts**: 
  - WriterCoinPayment.sol (payments)
  - GameNFT.sol (game NFTs)
  - StoryIPAuthor.sol (IP registration)
- **Wallet**: Farcaster Wallet (built-in) + Browser wallets (MetaMask, etc.)

## Dual-Chain Architecture (Base + Story)

### Current State (Base Chain)
WritArcade's existing system handles:
- **Writer Coins** ($AVC, etc.) - ERC-20 tokens on Base
- **GameNFT Contract** - Minting games as NFTs on Base
- **Revenue Distribution** - On-chain configurable per coin. Current AVC default: Generation 60% writer, 20% platform, 20% creator pool; Minting 30% creator, 15% writer, 5% platform (remainder returned to payer). No on-chain burn.
- **Wallet**: Farcaster (Base chain native)

### Proposed Enhancement (Story Chain)
Story Protocol adds:
- **IP Asset Registry** - Register games as permanent IP assets
- **License Terms** - Set usage permissions (e.g., "allow derivatives, 10% royalty")
- **Royalty Automation** - Revenue flows to parent IP creators forever
- **Derivative Tracking** - Full lineage graph (who used whose work)

### Integration Points
```
┌─────────────────────────────────────────────────────────────┐
│                   WritArcade Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  FRONTEND LAYER                                              │
│  ├─ Game Builder UI                                          │
│  ├─ IP Registration Modal                                   │
│  ├─ Royalty Dashboard                                       │
│  └─ Derivative Discovery                                    │
│                                                               │
│  API LAYER (Next.js Routes)                                 │
│  ├─ /api/games/generate        (WritArcade AI)             │
│  ├─ /api/games/[id]/mint       (Base minting)              │
│  ├─ /api/assets/save           (Save Draft)                │
│  ├─ /api/assets/marketplace    (Fetch Community Assets)    │
│  ├─ /api/assets/register       (Mint to Story Protocol)    │
│  ├─ /api/royalties/claim       (Story royalties)           │
│                                                               │
│  SERVICE LAYER                                              │
│  ├─ GameService                                             │
│  ├─ AssetService                                            │
│  ├─ BaseContractService ────┬─────────────────┐            │
│  └─ StoryProtocolService ───┤                 │            │
│                              ▼                 ▼            │
└─────────────────────────────────────────────────────────────┘
                                │                 │
                 ┌──────────────┘                 └──────────────┐
                 │                                               │
            BASE CHAIN                                     STORY CHAIN
         (Chain ID: 8453)                           (Chain ID: 1516 testnet)
                 │                                               │
         ┌───────┴──────────┐                           ┌────────┴──────────┐
         │                  │                           │                   │
    GameNFT          WriterCoin              IPAssetRegistry      Licensing
   Contract          Contracts               (ERC-721)           Module
                                                      │
                                             IP Account (ERC-6551)
                                                      │
                                          ┌──────────┬┴────────────┐
                                          │          │             │
                                      License    Royalty      Dispute
                                      Module     Module       Module
```

## Data Models

### Core Entities
```
User
├─ id (UUID)
├─ farcasterId (string)
├─ walletAddress (string)
└─ createdAt (timestamp)

Game
├─ id (UUID)
├─ userId (foreign key)
├─ articleUrl (string)
├─ title (string)
├─ genre (enum)
├─ difficulty (enum)
├─ gameState (JSON)
├─ nftId (string, optional)
└─ createdAt (timestamp)

WriterCoin
├─ id (UUID)
├─ name (string)
├─ symbol (string)
├─ contractAddress (string)
├─ publicationUrl (string)
└─ createdAt (timestamp)

Asset
├─ id (UUID)
├─ userId (foreign key)
├─ articleUrl (string)
├─ title (string)
├─ assetData (JSON)
├─ storyIpId (string, optional)
└─ createdAt (timestamp)
```

## Payment Flow

1. User selects writer coin ($AVC) and connects wallet
2. User pastes article URL and customizes game style
3. User pays 100 $AVC tokens to generate game
4. AI generates game with 4 unique options
5. User can play immediately or mint as NFT for 50 $AVC
6. Revenue distributed via 0xSplits:
   - 60% → Writer (content collaboration)
   - 20% → Creator pool (ongoing revenue for creators)
   - 20% → Platform (operations)
   - 10% → Platform (development)

## Security Considerations

- All user data is stored encrypted
- Wallet connections use secure protocols
- Smart contracts have been audited
- Rate limiting on API endpoints
- Input validation on all user-submitted data
- Regular security audits and penetration testing

## Scalability Patterns

- Horizontal scaling of API servers
- Database read replicas for heavy queries
- CDN for static assets
- Caching layer for frequently accessed data
- Background job processing for heavy operations
- Load balancing across multiple regions

## Monitoring & Observability

- Application performance monitoring (APM)
- Infrastructure monitoring
- Error tracking and alerting
- Business metrics dashboards
- User behavior analytics
- Smart contract event monitoring

---

## Production Readiness (December 13, 2025)

### User Roles & Access Control

**User Model** now includes role fields:
- `isCreator` (boolean): Can create and register IP assets
- `isAdmin` (boolean): Platform administrative access

Auto-set by:
- Setting `isCreator=true` when user first registers IP on Story Protocol
- Manual admin assignment for platform team

**API Endpoint**: `GET /api/auth/me` returns both fields.

### Configuration & Environment

**Required in Production**:
```env
PINATA_JWT=pina_xxx...              # IPFS metadata uploads (Story Protocol)
DATABASE_URL=postgresql://...       # PostgreSQL connection
STORY_RPC_URL=https://aeneid...    # Story Protocol RPC
NODE_ENV=production                 # Enables strict validation
```

**Production Safety Checks**:
- ✅ IPFS uploads **require** `PINATA_JWT` (throws error if missing, no silent fallbacks)
- ✅ Database connection uses TLS/SSL
- ✅ Rate limiting enabled by default
- ✅ All user input validated via Zod schemas

### Payment Verification (Async)

Payment verification is **non-blocking**:

```
Frontend                    Backend              Database
   │                           │                    │
   ├─ POST /api/payments/verify ─────────────────────>
   │                           │                    │
   │ <─ paymentId + statusUrl ──                    │ Stores payment record
   │                           │              with status="pending"
   │                           │
   │ Poll GET /api/payments/{id}/status
   │ ───────────────────────────>
   │                           │
   │ <─ status: "pending" ────────────────────────────
   │   (check again in 3 seconds)
```

**Flow**:
1. User submits transaction hash via POST
2. Payment stored in DB immediately (status="pending")
3. Frontend polls GET endpoint for confirmation
4. Status updates when blockchain confirms (future: real on-chain verification)

**Database Fields**: `transactionHash`, `amount`, `status`, `verifiedAt`, `userId`

### Data Sources (No Mocks in Production)

All dashboards and stats query real data:

| Endpoint | Data Source | Logic |
|----------|-------------|-------|
| `/api/auth/me` | User table | Returns actual role fields |
| `/api/creators/{wallet}/stats` | Payment + Game aggregates | Verified payments only, real article grouping |
| `/api/games/my-games` | Game table | User's wallet address |
| `CreatorDAO Dashboard` | Asset + AssetStoryRegistration tables | Real IP registration count |

**No simulated data, no hardcoded percentages, no mock dashboards.**

### IPFS & Story Protocol

**IPFS Storage** (`lib/ipfs-utils.ts`):
- Production: Pinata upload (requires `PINATA_JWT`)
- Development: Mock IPFS hash generation (for testing without Pinata)
- Fallback: Only in dev; production throws error if Pinata fails

**Story Protocol** (`app/my-games/page.tsx`):
- ✅ Client-side wallet signing (user owns their IP)
- ✅ Chain switching UX (Base → Story Aeneid → Base)
- ✅ Real SDK integration (not mocked)
- ✅ Optional flow (user can mint NFT on Base without Story registration)

### Logging & Debugging

Centralized logger (`lib/config.ts`) with:
- **Development**: Emoji indicators (ℹ️ info, ⚠️ warn, ❌ error, 🔍 debug)
- **Production**: Structured JSON output (ready for Sentry/DataDog)
- **Domain-specific**: `logger.payment()`, `logger.ipfs()`, `logger.storyProtocol()`

Example:
```typescript
logger.payment('Payment recorded for verification', {
  paymentId: payment.id,
  transactionHash: validatedData.transactionHash,
  status: payment.status,
  userId: user?.id,
})
```

### Deployment Checklist

Before deploying to production:

- [ ] Run Prisma migration: `npx prisma migrate deploy` (adds `isCreator`, `isAdmin` fields)
- [ ] Set `PINATA_JWT` environment variable
- [ ] Verify `DATABASE_URL` uses TLS connection
- [ ] Enable `ENABLE_RATE_LIMITING=true` (default)
- [ ] Test `/api/auth/me` returns `isCreator` and `isAdmin`
- [ ] Test payment verification flow (POST then GET polling)
- [ ] Test creator dashboard loads real data
- [ ] Verify Story Protocol registration works end-to-end
- [ ] Check logs show structured output (not just console.log)

### Removed in December 2025

- ✅ **Deleted**: `lib/migrations/data-migrator.ts` (legacy Sequelize migration, no longer used)
- ✅ **Removed**: Hardcoded false values for `isCreator` and `isAdmin`
- ✅ **Removed**: Mock data from CreatorDAO dashboard (now fetches API)
- ✅ **Removed**: Simulated stats service (now queries DB)
- ✅ **Removed**: Placeholder wallet addresses in migrations
- ✅ **Removed**: Story Protocol "Coming Soon" placeholders (flow implemented)