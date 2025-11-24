# WritArcade Development Guide

## Quick Start

### 1. Local Setup
```bash
cd /Users/udingethe/Dev/WritArcade

# Install dependencies
npm install --legacy-peer-deps

# Start dev server
npm run dev

# Opens: http://localhost:3000/mini-app
```

### 2. Current State Analysis

#### **Existing Foundation (Infinity Arcade)**
- Article-to-game AI generation pipeline (reusable)
- Interactive game streaming (works in browser)
- User authentication (extends to wallet auth)

#### **MVP Additions (WritArcade)**
- **Farcaster Mini App SDK**: Full-screen app in Farcaster
- **Paragraph Integration**: Fetch articles, validate author
- **Writer Coin Payments**: Multi-token ERC-20 support via Farcaster Wallet
- **Writer Coin Whitelist**: AVC + 2 more, configurable per writer
- **Base NFTs**: Mint games as ERC-721 tokens with writer coin metadata
- **Token Distribution**: Per-writer revenue split (60% writer, 20% platform, 20% community)

## Mini App SDK Migration

### Package Updates
- **Removed**: `@farcaster/frame-sdk` v0.0.64
- **Added**: `@farcaster/miniapp-sdk` v0.2.1
- **Rationale**: Frames v2 deprecated in March 2025; Mini Apps is the current standard

### Core Integration (lib/farcaster.ts)
```typescript
// Before
import sdk from '@farcaster/frame-sdk'
await initializeFarcasterSDK() // Returns boolean

// After  
import { sdk } from '@farcaster/miniapp-sdk'
await sdk.actions.ready() // Signals Mini App is ready
await getFarcasterContext() // Gets user/client context
```

**New Functions**:
- `getFarcasterContext()` - Get Mini App context (user, client, location info)
- `readyMiniApp()` - Call when UI is fully loaded
- `composeCast()` - Create a new cast (via Mini App SDK)
- `openUrl()` - Open external URLs in Mini App context

**Removed Functions**:
- `initializeFarcasterSDK()` - Replaced by getFarcasterContext + readyMiniApp
- `shareToFarcaster()` - Replaced by composeCast

### Mini App Page (app/mini-app/page.tsx)
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

### Context Structure
Mini App context now includes location info:
```typescript
{
  user: { fid, username, displayName, pfpUrl },
  client: { platformType, clientFid, added, notificationDetails },
  location: { type: 'cast_embed' | 'cast_share' | 'launcher' | etc }
}
```

Use `location.type` to understand how app was launched.

## File Structure

```
app/mini-app/
├── page.tsx                          ✅ Main flow with 4 steps
├── layout.tsx                        ✅ Manifest metadata
├── api/
│   ├── games/
│   │   └── generate/route.ts         ✅ Game generation endpoint
│   └── payments/
│       ├── initiate/route.ts         ✅ Payment info endpoint
│       └── verify/route.ts           ✅ Payment verification
└── components/
    ├── WriterCoinSelector.tsx        ✅ DONE
    ├── ArticleInput.tsx              ✅ DONE
    ├── GameCustomizer.tsx            ✅ Genre/difficulty + payment
    ├── GamePlayer.tsx                ✅ Gameplay + mint button
    └── PaymentButton.tsx             ✅ Reusable payment UI

lib/
├── farcaster.ts                      ✅ Mini App SDK integration
├── writerCoins.ts                    ✅ Configuration
├── paragraph.ts                      ✅ Article fetching
└── contracts.ts                      ✅ Smart contract helpers

contracts/
├── WriterCoinPayment.sol             ✅ Revenue distribution
├── GameNFT.sol                       ✅ ERC-721 NFT contract
└── deploy.md                         ✅ Deployment guide
```

## Key Components

### WriterCoinSelector
```typescript
// User selects from whitelisted writer coins
const [selectedCoin, setSelectedCoin] = useState<WriterCoin | null>(null)

// Currently supports only AVC for MVP
// Coin #2 and #3 pending confirmation
```

### ArticleInput
```typescript
// Validate Paragraph URL format
const validateUrl = (url: string) => {
  return url.includes('paragraph.com/@') && 
         url.includes(`/${writerCoin.paragraphAuthor}/`)
}
```

### GameCustomizer
```typescript
// Genre and difficulty selection
const [gameType, setGameType] = useState<'horror' | 'comedy' | 'mystery'>('horror')
const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy')

// Payment integration for game generation
const handleGenerate = async () => {
  await initiatePayment('generate-game')
}
```

### PaymentButton
```typescript
// Complete payment flow with Farcaster Wallet
const handlePayment = async () => {
  const result = await sendTransaction({
    to: contractAddress,
    data: encodedTransactionData
  })
  
  if (result.success) {
    await verifyPayment(result.transactionHash)
  }
}
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

### Deploy to Vercel
```bash
git push origin main
# Auto-deploys to Vercel
```

### View Database
```bash
npm run db:studio
# Opens Prisma Studio at http://localhost:5555
```

## Common Issues & Fixes

### "splash screen shows forever"
- **Cause**: `readyMiniApp()` not called
- **Fix**: Check `app/mini-app/page.tsx` has `await readyMiniApp()`

### "article preview not showing"
- **Cause**: Paragraph API fetch failed
- **Fix**: Check URL format, verify author matches writer coin

### "Mini App not loading in Farcaster"
- **Cause**: Manifest signature invalid
- **Fix**: Placeholder works for MVP. Sign for production.

### "TypeScript errors on build"
- **Cause**: SDK type mismatch
- **Fix**: Run `npm install --legacy-peer-deps`

## Testing Checklist

### Test Writer Coin Selection
1. Open http://localhost:3000/mini-app
2. Select "AVC" from dropdown
3. Should show "Fred Wilson's AVC"

### Test Article Input
1. Click next step
2. Paste valid AVC article: `https://avc.xyz/blog/...`
3. Should fetch and preview content

### Test Game Customizer
1. Click next step
2. Select genre (Horror/Comedy/Mystery)
3. Select difficulty (Easy/Hard)
4. See cost preview (100 AVC)

### Test Error Handling
1. Paste invalid URL
2. Should show error message
3. Try again with valid URL

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
  "@prisma/client": "^5.0.0"
}
```

### Environment Setup
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/writarcade"

# API Keys
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-project-id"
```

### Writer Coin Configuration
```typescript
// lib/writerCoins.ts
export const WRITER_COINS = [
  {
    id: "avc",
    name: "AVC",
    symbol: "$AVC",
    address: "0x06FC3D5D2369561e28F261148576520F5e49D6ea",
    writer: "Fred Wilson",
    paragraphAuthor: "fredwilson",
    paragraphUrl: "https://avc.xyz/",
    gameGenerationCost: 100n,  // 100 tokens
    mintCost: 50n,             // 50 tokens
    decimals: 18
  }
]
```

## Success Metrics (MVP)

### Week 5 Targets
- [ ] Mini App loads in Farcaster without errors
- [ ] Users can generate 1 game successfully (Horror/Easy)
- [ ] Transaction visible on BaseScan
- [ ] 10+ test users complete end-to-end flow

### Week 8 Targets
- [ ] 50+ Farcaster users signed up
- [ ] 50+ games generated
- [ ] 5+ games minted as NFTs
- [ ] <2 minute generation + mint time

## Next Steps for Production

### 1. Sign Manifest Properly
- Use Farcaster developer tools to generate real signature
- Update `accountAssociation` in manifest with custody address

### 2. Configure Webhook (if using notifications)
- Implement `/api/farcaster/webhook` endpoint
- Add `@farcaster/miniapp-node` for webhook verification

### 3. Test in Developer Mode
- Enable Developer Mode on Farcaster
- Test in Warpcast or Base App
- Verify manifest loads at `/.well-known/farcaster.json`

### 4. Deploy and Submit
- Publish to production domain
- Submit to Mini App Store
- Track analytics and user engagement

## References

**Farcaster Mini Apps Docs**:
- Main: https://miniapps.farcaster.xyz/
- SDK Reference: https://miniapps.farcaster.xyz/docs/specification
- Context API: https://miniapps.farcaster.xyz/docs/sdk/context

**Writer Coin Info**:
- AVC by Fred Wilson: https://avc.xyz/
- Paragraph: https://paragraph.com/

**Base Blockchain**:
- Docs: https://docs.base.org/
- Faucet: https://www.base.org/faucet