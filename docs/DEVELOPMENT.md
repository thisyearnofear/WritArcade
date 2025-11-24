# WritArcade Development Guide

**Last Updated:** November 24, 2025  
**Status:** Phase 5 Complete - Full Payment Support

## Quick Start

### 1. Local Setup
```bash
cd /Users/udingethe/Dev/WritArcade

# Install dependencies
npm install --legacy-peer-deps

# Start dev server
npm run dev

# Opens: 
# Web app: http://localhost:3000/
# Mini-app: http://localhost:3000/mini-app
```

### 2. Environment Configuration
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

# WalletConnect (for browser wallets)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-project-id"
```

## Current Implementation Status

**Phase 5: Browser Wallet & Web App Monetization** - 100% Complete ✅
- ✅ Mini App SDK migration (Frames v2 → Mini Apps)
- ✅ Wallet abstraction layer (Farcaster + browser wallets)
- ✅ True feature parity: web app + mini app share 95% business logic
- ✅ Browser wallet support (MetaMask, Coinbase, WalletConnect)
- ✅ Web app payment UI + customization (same as mini-app)
- ✅ Unified endpoints for both environments

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
    ├── games/generate/route.ts           ✅ Unified endpoint
    └── payments/
        ├── initiate/route.ts             ✅ Unified endpoint
        └── verify/route.ts               ✅ Unified endpoint

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

### Check Types
```bash
npm run type-check
```

### Build for Production
```bash
npm run build
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
- **Cause:** SDK type mismatch
- **Fix:** Run `npm install --legacy-peer-deps`

### "payment flow not working"
- **Cause:** Smart contract addresses not set
- **Fix:** Verify `NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS` and `NEXT_PUBLIC_GAME_NFT_ADDRESS`

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

### Package.json Dependencies
```json
{
  "@farcaster/miniapp-sdk": "^0.2.1",
  "next": "^16.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.0.0",
  "prisma": "^5.0.0",
  "@prisma/client": "^5.0.0",
  "rainbowkit": "^1.0.0",
  "wagmi": "^1.0.0",
  "viem": "^1.0.0"
}
```

## Success Metrics (Current)

### Phase 5 Complete ✅
- ✅ Mini App loads without errors
- ✅ Web app has full payment parity with mini-app
- ✅ Users can generate games in both environments
- ✅ Browser wallet connection works (MetaMask, Coinbase, WalletConnect)
- ✅ Payment flows functional in both environments
- ✅ 95% code sharing between platforms
- ✅ All 8 core principles implemented

## Success Metrics (Current)

### Phase 5 Complete ✅
- ✅ Mini App loads without errors
- ✅ Web app has full payment parity with mini-app
- ✅ Users can generate games in both environments
- ✅ Browser wallet connection works (MetaMask, Coinbase, WalletConnect)
- ✅ Payment flows functional in both environments
- ✅ 95% code sharing between platforms
- ✅ All 8 core principles implemented

---

**Ready for Production:** All core functionality implemented and tested across both environments.