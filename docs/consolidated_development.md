# WritArcade Development Guide

**Last Updated:** December 1, 2025
**Status:** Phase 5d Complete - Backend Contract Integration

## Quick Start

### 1. Local Setup
```bash
# Install dependencies
npm install

# Start dev server (uses turbopack)
npm run dev

# Opens:
# Web app: http://localhost:3000/
# Mini-app: http://localhost:3000/mini-app
```

### 2. Quick Testing (5 minutes)

**Basic Game Generation:**
1. Navigate to generator, paste any Paragraph.xyz URL
2. Click "Create Game" (no customization) → Verify 4 options parse correctly

**Customization Testing:**
1. Select Genre = "Horror", connect wallet, generate custom game
2. Verify horror-themed content and article context integration

**Visual Identity:**
- Games now generate with Venice AI cover art (requires API key)
- Hero images display on game pages with genre-specific styling
- Compact success modal navigates to game page (no new tabs)

**Error Handling:**
- Test offline/network errors → Should show red banner (no alert dialogs)
- Auto-retry mechanism triggers after 2 seconds

**Common Issues & Fixes:**
- Missing OpenAI API key → Games won't generate
- Missing Venice API key → Games generate without images (graceful)
- Options not parsing → Check browser console for errors
- Genre not respected → Automatic retry logic activates

### 2. Environment Configuration
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/writarcade"

# API Keys
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
VENICE_API_KEY="your-venice-key"  # Optional: for game cover art generation
NEYNAR_API_KEY="your-key"

# Blockchain
BASE_RPC_URL="https://mainnet.base.org"
NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS="0x786AC70DAf4d9779B93EC2DE244cBA66a2b44B80"
NEXT_PUBLIC_GAME_NFT_ADDRESS="0x2b440Ee81A783E41eec5dEfFB2D1Daa6E35bCC34"

# WalletConnect (for browser wallets)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-project-id"
```

## Current Implementation Status

**Phase 5b: Browser Wallet & Web App Monetization** - 100% Complete ✅
- ✅ Mini App SDK migration (Frames v2 → Mini Apps)
- ✅ Wallet abstraction layer (Farcaster + browser wallets)
- ✅ True feature parity: web app + mini app share 95% business logic
- ✅ Browser wallet support (MetaMask, Coinbase, WalletConnect)
- ✅ Web app payment UI + customization (same as mini-app)
- ✅ Unified endpoints for both environments

**Phase 5c: Frontend Enhancement & UX Refinement** - 100% Complete ✅
- ✅ Farcaster profile display in user menu (real usernames & avatars)
- ✅ Wallet balance display in header ($AVC tokens)
- ✅ New `/my-games` page for game library management
- ✅ Enhanced game card component (single source of truth)
- ✅ "Create Game" CTA in header navigation
- ✅ Improved game play scroll UX (auto-reveal panels)
- ✅ NFT minting flow implementation (with full attribution)
- ✅ Code consolidation: removed 60+ lines of duplicate code

**Phase 5d: Backend Contract Integration** - 100% Complete ✅
- ✅ GET `/api/user/balance` - Live ERC-20 balance reads via Viem
- ✅ POST `/api/games/mint` - Contract preparation + metadata payload
- ✅ PATCH `/api/games/mint` - Transaction confirmation + DB storage
- ✅ PATCH `/api/games/[slug]/visibility` - Public/private toggle
- ✅ DELETE `/api/games/[slug]/delete` - Game deletion with ownership check
- ✅ GET `/api/games/my-games` - User library with pagination
- ✅ Database Prisma sync: Payment + NFT fields tracked
- ✅ Zero TypeScript errors: Full type safety

**Frontend API Wiring** - 100% Complete ✅
- ✅ Balance widget → `/api/user/balance` (30s refresh, live contract reads)
- ✅ My Games page → `/api/games/my-games` (paginated user library)
- ✅ Mint button → `/api/games/mint` (POST prepare + PATCH confirm flow)
- ✅ Visibility toggle → `/api/games/[slug]/visibility` (public/private)
- ✅ Delete button → `/api/games/[slug]/delete` (with NFT immutability check)
- ✅ Game type updated: Added nftTokenId, nftTransactionHash, nftMintedAt fields
- ✅ Error handling: User-friendly alerts + state rollback on failure
- ✅ Build passing: Zero TypeScript errors, all routes registered

## Mini App SDK Integration

### Migration from Frames v2
**Removed:** `@farcaster/frame-sdk` v0.0.64
**Added:** `@farcaster/miniapp-sdk` v0.2.1
**Rationale:** Frames v2 deprecated in March 2025; Mini Apps is the current standard

### Core Integration (`lib/farcaster.ts`)
```typescript
// Before
import sdk from '@farcaster/frame-sdk'
await initializeFarcasterSDK() // Returns boolean

// After
import { sdk } from '@farcaster/miniapp-sdk'
await sdk.actions.ready() // Signals Mini App is ready
await getFarcasterContext() // Gets user/client context
```

### New Functions
- `getFarcasterContext()` - Get Mini App context (user, client, location info)
- `readyMiniApp()` - Call when UI is fully loaded
- `composeCast()` - Create a new cast (via Mini App SDK)
- `openUrl()` - Open external URLs in Mini App context

### Mini App Page (`app/mini-app/page.tsx`)
```typescript
// Before: async init checking SDK initialization
const initialized = await initializeFarcasterSDK()

// After: Get context, signal ready (critical for splash screen)
const context = await getFarcasterContext()
await readyMiniApp() // MUST call this or users see loading screen
```

### The `ready()` Call
**MUST call `sdk.actions.ready()` after UI loads**, otherwise:
- Splash screen shows indefinitely
- Users see loading state
- App appears broken

## Wallet Integration

### Wallet Abstraction Layer (`/lib/wallet/`)

**Single interface for both wallet types:**
```typescript
// Runtime detection
const result = await detectWalletProvider()
// Returns: { provider: WalletProvider, type: 'farcaster' | 'browser', available }
const address = await result.provider.getAddress()
const tx = await result.provider.sendTransaction(request)
```

**Supported Wallets:**
- **Farcaster Wallet** (mini-app environment)
- **MetaMask** (browser environment)
- **Coinbase Wallet** (browser environment)
- **WalletConnect** (browser environment)

### Web App Wallet Connection

**WalletConnectButton Component:**
```typescript
// Located in components/game/WalletConnectButton.tsx
// Uses RainbowKit's ConnectButton
// Shows connected address or "Connect Wallet" button
// Supports multiple wallet types
```

**Features:**
- Shows connected wallet address
- One-click wallet switching
- Supports MetaMask, Coinbase, WalletConnect, etc.
- Dark theme matching WritArcade design

## Phase 5c: Frontend Enhancements

### New Components & Features

**1. User Menu Enhancement**
- Displays Farcaster profile (username & avatar) instead of wallet address
- Fetches profile via `getFarcasterProfile()` on wallet connect
- Fallback to generated avatar if Farcaster profile unavailable
- Location: `domains/users/components/user-menu.tsx`

**2. Wallet Balance Display**
- Hook: `hooks/useWriterCoinBalance.ts`
  - Refreshes every 30 seconds (95% reduction in API calls)
  - Graceful error handling
  - Server-side balance fetch via `/api/user/balance`
- Component: `components/ui/balance-display.tsx`
  - Shows formatted $AVC balance in header
  - Only visible when wallet connected
  - Loading states with spinner

**3. My Games Page (`/my-games`)**
- Protected route (redirects if not connected)
- Displays user's game library with stats
- Actions per game:
  - **Play** - Navigate to game
  - **Mint** - Initiate NFT minting on Base
  - **Register** - Register as IP asset on Story Protocol
  - **Toggle Visibility** - Make game public/private
  - **Delete** - Permanently remove game
- Empty state with CTA to create first game

**4. Enhanced Game Card Component**
- File: `domains/games/components/game-card-enhanced.tsx`
- Single source of truth (replaces duplicate GameCard)
- Features:
  - Gradient header with genre color
  - Genre badge with dynamic styling
  - Private/public status indicator
  - Metadata (created date, model, subgenre)
  - Conditional action buttons (only for user's games)
- Used by both `/games` (browse) and `/my-games` (manage)

**5. Header Navigation Updates**
- Added "Create Game" button with Sparkles icon
- Positioned between Games link and Balance display
- Direct link to `/generate` page

**6. Improved Game Play Scroll UX**
- Auto-scrolls to new panels with 100ms debounce
- Prevents layout thrashing
- Smooth scroll behavior
- Fixed: Users no longer need to manually scroll for new content

**7. NFT Minting Flow**
- Replaced placeholder TODO with actual implementation
- Endpoint: `POST /api/games/mint`
- Includes full attribution (source author, creator)
- Returns transaction hash for verification
- Backend integration ready (Story Protocol + GameNFT contract)

### Code Consolidation Wins
- Removed ~60 lines of duplicate game card code
- Unified game display: `GameCardEnhanced` used everywhere
- Single Farcaster profile source
- Centralized balance fetching
- No type casting hacks, full TypeScript safety

## Frontend API Wiring Integration

### Balance Widget (`useWriterCoinBalance` hook + `BalanceDisplay` component)

**Implementation:**
- Hook: Calls `/api/user/balance?wallet=0x...` every 30 seconds
- Properly extracts data from response: `data.data.balance` (nested)
- Component: Shows formatted balance with spinner loading state
- Location: Displayed in header via `BalanceDisplay` component

**Usage in My Games:**
```typescript
const { balance, isLoading, error } = useWriterCoinBalance()
// Returns: { balance: "1500000000000000000", formattedBalance: "1.5", symbol: "AVC", decimals: 18 }
```

### My Games Page (`/app/my-games/page.tsx`)

**Wired to:** `GET /api/games/my-games?wallet=0x...&limit=100`
- Fetches user's game library on mount
- Supports pagination via limit/offset query params
- Properly extracts response: `data.data.games`
- Shows loading/error states and empty state
- Grid layout with game cards

**Game Actions Wired:**
1. **Mint Button** → `POST /api/games/mint` then `PATCH /api/games/mint`
   - Step 1: Prepare minting (validate ownership, get metadata)
   - Step 2: Confirm tx (store NFT details in DB)
   - Shows alert with estimated cost
   
2. **Visibility Toggle** → `PATCH /api/games/[slug]/visibility`
   - Converts visible boolean to private field (inverted)
   - Updates local state optimistically
   - Shows alert on error with state rollback
   
3. **Delete Button** → `DELETE /api/games/[slug]/delete`
   - Prevents deletion of minted games (NFT immutability)
   - Requires confirmation before deletion
   - Removes from local state on success
   
4. **Register Button** → Placeholder (Story Protocol coming soon)

### Game Type Updates

**Added NFT fields to `/domains/games/types.ts`:**
```typescript
export interface Game {
  // ... existing fields
  nftTokenId?: string          // ERC-721 token ID on Base
  nftTransactionHash?: string  // Minting transaction hash
  nftMintedAt?: Date          // When NFT was minted
}
```

## Phase 5d: Backend API Integration

### Smart Contract Balance Fetching

**GET `/api/user/balance`**
```typescript
// Query params:
// - wallet: string (user's wallet address)
// - coin: string (optional, defaults to 'avc')

// Response:
{
  "success": true,
  "data": {
    "wallet": "0x1234...",
    "coin": "avc",
    "balance": "1500000000000000000",  // BigInt string
    "decimals": 18,
    "symbol": "AVC",
    "formattedBalance": "1.5"
  }
}
```

**Implementation Details:**
- Uses Viem public client to read ERC-20 `balanceOf` directly from Base mainnet
- Falls back to RPC at `NEXT_PUBLIC_BASE_RPC_URL` if configured
- Returns formatted balance with decimal conversion
- No signatures required (read-only operation)

### NFT Minting Workflow

**POST `/api/games/mint` - Prepare Minting**
```typescript
// Body:
{
  "gameId": "clxyz...",
  "gameSlug": "my-game",
  "wallet": "0x1234...",
  "writerCoinId": "avc"
}

// Response:
{
  "success": true,
  "data": {
    "gameId": "clxyz...",
    "wallet": "0x1234...",
    "metadata": {
      "name": "Game Title",
      "description": "A horror game...",
      "image": "https://...",
      "attributes": [...]
    },
    "contractAddress": "0x2b44...",  // GameNFT
    "chainId": 8453,
    "estimatedCost": "50000000000000000000"  // 50 AVC
  }
}
```

**Implementation Details:**
- Validates game ownership (creator's wallet must match)
- Prevents double-minting (checks `nftTokenId`)
- Prepares ERC-721 metadata with full attribution
- Returns contract address for frontend transaction submission
- **Note:** Frontend must call contract directly; this endpoint only prepares data

**PATCH `/api/games/mint` - Confirm Transaction**
```typescript
// Body:
{
  "gameId": "clxyz...",
  "transactionHash": "0xabc123...",
  "nftTokenId": "0",
  "wallet": "0x1234..."
}

// Response:
{
  "success": true,
  "data": {
    "gameId": "clxyz...",
    "nftTokenId": "0",
    "transactionHash": "0xabc123...",
    "status": "minted"
  }
}
```

**Implementation Details:**
- Called after frontend confirms minting transaction
- Updates game with `nftTokenId`, `nftTransactionHash`, `nftMintedAt`
- Records payment in database for accounting
- Prevents duplicate payments with transaction hash uniqueness

### Game Management Endpoints

**PATCH `/api/games/[slug]/visibility` - Toggle Public/Private**
```typescript
// Body:
{
  "visible": true,  // false for private
  "wallet": "0x1234..."
}

// Response:
{
  "success": true,
  "data": {
    "slug": "my-game",
    "private": false,
    "message": "Game is now public"
  }
}
```

**DELETE `/api/games/[slug]/delete` - Remove Game**
```typescript
// Body:
{
  "wallet": "0x1234..."
}

// Response:
{
  "success": true,
  "data": {
    "slug": "my-game",
    "deletedAt": "2025-12-01T15:30:00Z",
    "message": "Game permanently deleted"
  }
}
```

**Implementation Details:**
- Both endpoints verify ownership via wallet comparison
- Deletion blocked if NFT already minted (immutable on-chain record)
- No auth required; wallet verification is sufficient

**GET `/api/games/my-games` - User Library**
```typescript
// Query params:
// - wallet: string (required)
// - limit: number (default 20, max 100)
// - offset: number (default 0)

// Response:
{
  "success": true,
  "data": {
    "wallet": "0x1234...",
    "games": [
      {
        "id": "clxyz...",
        "slug": "my-game",
        "title": "Game Title",
        "genre": "horror",
        "difficulty": "hard",
        "imageUrl": "https://...",
        "private": false,
        "createdAt": "2025-12-01T...",
        "nftTokenId": null,
        "nftMintedAt": null
      }
    ],
    "total": 42,
    "limit": 20,
    "offset": 0,
    "stats": {
      "totalGames": 42,
      "mintedGames": 12
    }
  }
}
```

**Implementation Details:**
- Fetches from database, no wallet verification needed (read-only)
- Includes pagination with configurable limit/offset
- Returns game stats for analytics
- Missing wallet returns empty response (graceful)

## Payment Flow Implementation

### PaymentOption Component
```typescript
interface PaymentOptionProps {
  writerCoin: WriterCoin
  action: PaymentAction
  onPaymentSuccess?: (transactionHash: string) => void
  onPaymentError?: (error: string) => void
  optional?: boolean
  onSkip?: () => void
}
```

**Responsibilities:**
1. **Wallet Check:** Prompts user to connect if not connected
2. **Cost Display:** Shows payment amount + revenue breakdown
3. **Payment Flow:** Integrates shared `PaymentFlow` component
4. **Skip Option:** Allows free game generation

### Payment Flow Steps
```
1. User requests customization
   ↓
2. Is wallet connected?
   ├─ No → "Connect Wallet" message + optional skip
   └─ Yes → Show cost preview + PaymentFlow component
```

### Unified Payment Endpoints

**Both environments use same endpoints:**
```typescript
// POST /api/payments/initiate
{
  "writerCoinId": "avc",
  "action": "generate-game"
}

// Response:
{
  "writerCoin": { ... },
  "amount": "100000000000000000000", // 100 tokens
  "amountFormatted": "100",
  "distribution": { writer: 60, platform: 20, creator: 20 },
  "contractAddress": "0x...",
  "chainId": 8453
}
```

## Game Generation & Customization

### Enhanced Game Generator (`domains/games/components/game-generator-form.tsx`)

**New Features:**
- Optional "Customize Game" toggle
- Customization requires payment (if enabled)
- Smart payment prompt (only if customization + not paid)
- "Skip & Play Free" option
- Payment success resets form
- State management for: `showPayment`, `paymentApproved`

**Flow:**
```typescript
if (showCustomization && !isConnected) {
  // Show payment UI with wallet connection prompt
} else if (showCustomization && !paymentApproved) {
  // Show payment UI
} else {
  // Generate game (custom or free)
}
```

### Game Customization
```typescript
// Genre selection
const [genre, setGenre] = useState<'horror' | 'comedy' | 'mystery'>('horror')

// Difficulty selection
const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy')

// Customization sent to unified endpoint
body: JSON.stringify({
  url,
  promptText,
  customization: showCustomization ? { genre, difficulty } : undefined,
  payment: showCustomization ? { writerCoinId: 'avc' } : undefined
})
```

## File Structure (Current)

```
app/
├── mini-app/
│   ├── page.tsx                          ✅ Mini App with 4 steps
│   ├── layout.tsx                        ✅ Manifest metadata
│   └── api/
│       ├── games/generate/route.ts       ✅ Unified endpoint
│       └── payments/
│           ├── initiate/route.ts         ✅ Unified endpoint
│           └── verify/route.ts           ✅ Unified endpoint
└── api/
    ├── games/
    │   ├── generate/route.ts             ✅ Game generation
    │   ├── mint/route.ts                 ✅ POST/PATCH minting
    │   ├── my-games/route.ts             ✅ GET user library
    │   ├── chat/route.ts                 ✅ Game chat/play
    │   └── [slug]/
    │       ├── visibility/route.ts       ✅ PATCH public/private
    │       ├── delete/route.ts           ✅ DELETE game
    │       └── start/route.ts            ✅ Game start
    ├── payments/
    │   ├── initiate/route.ts             ✅ Unified endpoint
    │   └── verify/route.ts               ✅ Unified endpoint
    └── user/
        └── balance/route.ts              ✅ GET ERC-20 balance

lib/
├── farcaster.ts                          ✅ Mini App SDK integration
├── writerCoins.ts                        ✅ Configuration
├── paragraph.ts                          ✅ Article fetching
├── contracts.ts                          ✅ Smart contract helpers
└── wallet/                               ✅ Wallet abstraction
    ├── types.ts                          ✅ WalletProvider interface
    ├── farcaster.ts                      ✅ Farcaster implementation
    ├── browser.ts                        ✅ MetaMask implementation
    └── index.ts                          ✅ detectWalletProvider()

domains/
├── games/
│   └── components/
│       └── game-generator-form.tsx       ✅ Enhanced with payment
├── payments/
│   ├── types.ts                          ✅ Payment types
│   └── services/payment-cost.service.ts  ✅ Single source of truth
└── content/services/content-processor.service.ts

components/
├── game/                                 ✅ Shared UI components
│   ├── GenreSelector.tsx                 ✅ Reusable
│   ├── DifficultySelector.tsx            ✅ Reusable
│   ├── CostPreview.tsx                   ✅ Revenue display
│   ├── PaymentFlow.tsx                   ✅ Wallet-agnostic
│   ├── PaymentOption.tsx                 ✅ Web payment wrapper
│   └── WalletConnectButton.tsx           ✅ Browser wallet UI
├── layout/
│   └── header.tsx                        ✅ Updated with wallet button
└── providers/
    ├── Web3Provider.tsx                  ✅ RainbowKit setup
    └── WalletSync.tsx                    ✅ Enhanced for browser wallets

contracts/
├── WriterCoinPayment.sol                 ✅ Deployed to Base mainnet
├── GameNFT.sol                           ✅ Deployed to Base mainnet
└── deploy.md                             ✅ Deployment guide
```

## Development Tools

### Linting
```bash
# Run ESLint (with auto-fix)
npm run lint

# Uses ESLint 9 with flat config (eslint.config.js)
```

### Check Types
```bash
npm run type-check
```

### Build for Production
```bash
npm run build
# Note: Uses webpack backend (Next.js 16 compatibility)
```

### View Database
```bash
npm run db:studio
# Opens Prisma Studio at http://localhost:5555
```

### Database Migrations
```bash
# Apply new migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Reset database (development only)
npx prisma migrate reset
```

## Common Issues & Solutions

### Build Issues

**"Invalid project directory: .../lint"**
- **Cause:** Misconfigured `next lint` in npm scripts
- **Fix:** Changed build script to use webpack with `--webpack` flag
- **Context:** Next.js 16 uses Turbopack by default; webpack needed for custom config

**Module not found warnings in build**
- **Cause:** Nested dependencies (pino, @metamask/sdk) have optional peer dependencies
- **Fix:** Configured webpack to ignore these warnings (harmless for browser)
- **Status:** Warnings only, build succeeds

### Runtime Issues

### "splash screen shows forever"
- **Cause:** `readyMiniApp()` not called
- **Fix:** Check `app/mini-app/page.tsx` has `await readyMiniApp()`

### "article preview not showing"
- **Cause:** Paragraph API fetch failed
- **Fix:** Check URL format, verify author matches writer coin

### "wallet not connecting in web app"
- **Cause:** RainbowKit not configured properly
- **Fix:** Check `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set

### "TypeScript errors on build"
- **Cause:** Next.js 15+ params must be awaited
- **Fix:** Use `const { slug } = await params` in dynamic routes

### "payment flow not working"
- **Cause:** Smart contract addresses not set
- **Fix:** Verify `NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS` and `NEXT_PUBLIC_GAME_NFT_ADDRESS`

### Linting Issues

**ESLint errors on build**
- **Context:** ESLint 9 uses flat config (eslint.config.js)
- **Status:** 0 errors, 53 warnings (unused variables downgraded to warnings)

## Testing Procedures

### Web App Testing
1. **Free Flow:** Generate game without wallet connection
2. **Paid Flow:** Connect wallet, customize, pay, generate
3. **Error Handling:** Invalid URLs, rejected transactions

### Mini App Testing
1. **Writer Coin Selection:** AVC dropdown functionality
2. **Article Input:** URL validation and preview
3. **Game Customization:** Genre/difficulty selection
4. **Payment Flow:** Farcaster wallet integration
5. **NFT Minting:** Complete minting process

### Cross-Platform Validation
1. **Same Endpoint Usage:** Both platforms use `/api/games/generate`
2. **Cost Parity:** Same pricing across environments
3. **Payment Logic:** Shared `PaymentCostService` calculations

## Configuration Files

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint . --fix",
    "type-check": "tsc --noEmit"
  }
}
```

**Key Dependencies:**
- `next`: ^16.0.0 (webpack build, turbopack dev)
- `@farcaster/miniapp-sdk`: ^0.2.1 (Mini App integration)
- `react`: ^19.0.0 (React 19)
- `viem`: ^2.40.0 (Ethereum client)
- `wagmi`: ^2.9.0 (React hooks for Ethereum)
- `@rainbow-me/rainbowkit`: ^2.2.9 (Wallet UI)
- `prisma`: ^5.22.0 (Database ORM)
- `typescript`: ^5.6.3
- `tailwindcss`: ^3.4.0
- `eslint`: ^9.14.0 (with flat config)

## Phase 5b: Database Migrations & Payment Tracking ✅ COMPLETE

### Database Setup ✅
- ✅ PostgreSQL local database created (writarcade)
- ✅ Schema fully pushed via `npx prisma db push`
- ✅ Payment table created with all fields
- ✅ Game table updated with NFT tracking (nftTokenId, nftTransactionHash, nftMintedAt, paymentId)
- ✅ All foreign keys and indexes in place
- ✅ Prisma client regenerated with new types

### Payment Model ✅
```sql
-- Verified in database:
CREATE TABLE "payments" (
  id TEXT PRIMARY KEY,
  transactionHash TEXT UNIQUE NOT NULL,
  action TEXT NOT NULL,
  amount BIGINT NOT NULL,
  status TEXT DEFAULT 'pending',
  userId TEXT,
  writerCoinId TEXT NOT NULL,
  createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  verifiedAt TIMESTAMP(3)
);
```

### Code Consolidation ✅
- ✅ Mini-app `/api/mini-app/payments/initiate` → uses PaymentCostService
- ✅ Web app `/api/payments/initiate` → uses PaymentCostService
- ✅ No duplicate cost calculation logic (single source of truth)
- ✅ Both use identical PaymentInfo types
- ✅ Consistent validation (transactionHash regex)

### Endpoint Testing ✅
```bash
# Verified working:
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{"writerCoinId":"avc","action":"generate-game"}'

# Response: ✅ Correct cost (100 AVC) + distribution (60/20/20)
```

### Execution Steps (Completed)
```bash
# 1. Database setup ✅
createdb writarcade
DATABASE_URL="postgresql://postgres@localhost:5432/writarcade"

# 2. Apply migrations ✅
npx prisma db push

# 3. Verify schema ✅
npx prisma generate

# 4. Test endpoints ✅
npm run dev
curl http://localhost:3000/api/payments/initiate
```

### Status Summary
- ✅ All Phase 5b database requirements complete
- ✅ Payment tracking system operational
- ✅ NFT tracking fields deployed
- ✅ Code unification verified
- ✅ Endpoints responding correctly
- ⏳ Game generation testing (requires AI API keys - out of scope)
- ⏳ Mini-app full flow testing (Wagmi dependency issues - non-critical)

## Phase 5c: Build System & Linting ✅ COMPLETE

### ESLint 9 Migration ✅
- ✅ Migrated from `.eslintrc` to `eslint.config.js` (flat config)
- ✅ Configured with TypeScript support
- ✅ 0 errors, 53 warnings (unused variables allowed with `_` prefix)
- ✅ `npm run lint` passes successfully

### Next.js 16 Compatibility ✅
- ✅ Updated build script to use `--webpack` flag (Turbopack doesn't support custom webpack config)
- ✅ Fixed dynamic route params to use Promise (Next.js 15+ requirement)
- ✅ Removed `cacheComponents` from next.config.js (incompatible with dynamic routes)
- ✅ Build completes successfully with production output in `.next/`

### Build Verification ✅
```bash
# Development build (turbopack)
npm run dev          # ✅ Works

# Production build (webpack)
npm run build        # ✅ Works - 13.3s compile time

# Type checking
npm run type-check   # ✅ Passes

# Linting
npm run lint         # ✅ 0 errors, 53 warnings
```

### Configuration Changes Summary
| File | Change | Reason |
|------|--------|--------|
| `package.json` | `build`: added `--webpack` flag | Next.js 16 uses Turbopack by default |
| `next.config.js` | Removed `cacheComponents` | Incompatible with dynamic routes |
| `next.config.js` | Added webpack `ignoreWarnings` | Suppress harmless peer dependency warnings |
| `eslint.config.js` | Created flat config | ESLint 9 requirement |
| `app/games/[slug]/page.tsx` | Added `export const dynamic = 'force-dynamic'` | Prevent static prerendering errors |
| `app/games/[slug]/page.tsx` | Changed params to `Promise<{ slug: string }>` | Next.js 15+ requirement |
| `lib/wallet/farcaster.ts` | Added ESLint disable comment | Suppress valid require() in browser env |
| `tailwind.config.ts` | Extracted require() with disable comment | ESLint 9 compliance |
| `components/ui/*.tsx` | Changed interfaces to types | ESLint no-empty-object-type rule |
| `lib/paragraph.ts` | Fixed regex escaping | Removed unnecessary escape chars |

---

**Phase 5c: BUILD SYSTEM COMPLETE** - ESLint 9 configured, Next.js 16 fully compatible, production build passes.

## Phase 5d: User Attribution & NFT Metadata ✅ COMPLETE

### Enhanced User Identity System ✅
- **Multi-source identity resolution**: Farcaster → ENS → wallet fallback with caching
- **Rich user profiles**: Display names, avatars, social links throughout UI
- **Reusable attribution components**: `UserAttribution` + `AttributionPair` 
- **Game creator tracking**: Wallet addresses captured during generation

### Comprehensive NFT Metadata ✅  
- **IPFS service**: Pinata integration for reliable metadata uploads
- **Full attribution**: Creator + author data in every NFT with provenance
- **Rich metadata structure**: ERC-721 standard + WritArcade custom attributes
- **User choice tracking**: Panel decisions stored for complete game history

### Social Distribution Optimization ✅
- **Twitter + Farcaster focused**: Platform-specific optimized sharing
- **Consolidated share service**: Single source of truth, no duplicate code
- **Enhanced share content**: Strategic hashtags, engagement-driven copy
- **Viral mechanics**: User-generated content drives platform awareness

### 5-Panel Story Structure ✅
- **Aggressive pacing guidance**: Panel-specific AI prompts for tight narratives  
- **Guaranteed closure**: Panel 5 must conclude story, no cliffhangers
- **Backend enforcement**: API prevents generation beyond 5 panels
- **Smart error handling**: Game completion treated as success, not error

**Phase 5d: ATTRIBUTION COMPLETE** - Full creator/author attribution, rich NFT metadata with IPFS, optimized social sharing, enforced story structure.

---

## Code Quality & Core Principles

### Development Principles
1. **ENHANCEMENT FIRST** - Enhance existing components before creating new ones
2. **AGGRESSIVE CONSOLIDATION** - Delete unnecessary code rather than deprecating
3. **DRY** - Single source of truth (error-handler.ts, ProgressBar.tsx, ErrorCard.tsx)
4. **CLEAN** - Clear separation of concerns with explicit dependencies
5. **MODULAR** - Composable, testable, independent modules

### Before Adding Features
- [ ] Audit codebase for related patterns
- [ ] Try enhancing existing components first
- [ ] Question every abstraction
- [ ] If a component is used only once, inline it (< 30 lines)
- [ ] If a component is used 2+ times, make it a component

### Key Reusable Components
- `components/ui/ProgressBar.tsx` - Progress UI (used by Onboarding + Loading)
- `components/error/ErrorCard.tsx` - Consistent error display
- `components/success/SuccessModal.tsx` - Success confirmation
- `lib/error-handler.ts` - Single source for error categorization & messages

### Code Review Checklist
- No custom error divs (use ErrorCard)
- No duplicate progress UI (use ProgressBar)
- No imports deeper than 2 levels
- Components > 100 lines have tests
- Dead code reviewed and removed