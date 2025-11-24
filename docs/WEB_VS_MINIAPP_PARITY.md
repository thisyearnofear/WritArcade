# Web App vs Mini App Parity Analysis

## Overview

Currently there is **significant divergence** between the web app and mini app. They serve different purposes and don't share a unified experience. Users cannot consistently undertake the same functionality across both environments.

## Current State

### Mini App (`/mini-app`)
**Purpose**: Farcaster-native experience with writer coin payments

**Functionality**:
- ✅ Writer coin selection (AVC only)
- ✅ Article input with Paragraph validation
- ✅ Game customization (genre + difficulty)
- ✅ Payment flow (requires 100 $AVC to generate)
- ✅ Game play + NFT minting (requires 50 $AVC)
- ✅ Farcaster Wallet integration
- ✅ On-chain verification

**Tech Stack**:
- Farcaster Mini App SDK
- Tailwind CSS (custom styling)
- PaymentButton component
- Custom game generation endpoint (`/api/mini-app/games/generate`)

### Web App (`/app`)
**Purpose**: Public-facing web presence (doesn't require payment)

**Functionality**:
- ✅ Game generation form (free, no payment)
- ✅ Accepts URL or text input
- ✅ Game display/gallery
- ✅ No customization (genre/difficulty)
- ❌ No writer coin selection
- ❌ No payment integration
- ❌ No NFT minting
- ✅ Different game generation endpoint (`/api/games/generate`)

**Tech Stack**:
- Separate component architecture
- UI library (button, textarea, input, label)
- Different styling approach

## The Divergence Problem

| Feature | Mini App | Web App | Unified? |
|---------|----------|---------|----------|
| Article Input | ✅ Validated (Paragraph) | ✅ Basic URL input | ⚠️ No |
| Genre Selection | ✅ Yes (Horror/Comedy/Mystery) | ❌ No | ❌ No |
| Difficulty | ✅ Yes (Easy/Hard) | ❌ No | ❌ No |
| Payment | ✅ Yes ($AVC required) | ❌ No (free) | ❌ No |
| NFT Minting | ✅ Yes | ❌ No | ❌ No |
| Game Generation | ✅ Custom endpoint | ✅ Different endpoint | ❌ No |
| Wallet Connection | ✅ Farcaster | ❌ None | ❌ No |
| UI Components | Custom built | Reusable lib | ❌ Duplicated |
| Styling | Tailwind (dark) | Tailwind + lib | ⚠️ Inconsistent |

## Why This Matters

**User Experience Issues:**
1. Users can't get consistent features across environments
2. Web app is basically a landing page + free generator (not feature-complete)
3. Mini app is the real product (paid, full features)
4. Duplicated component code leads to maintenance burden
5. Different APIs for same functionality

**Business Issues:**
1. Web app doesn't monetize (no payment capability)
2. Users have no preview of mini app experience
3. SEO/marketing value lost (web app is weak)
4. Code duplication and complexity

## Recommended Solution: Unified Experience

### Option A: Make Web App a "Preview" (Recommended for MVP)
Web app shows what's possible, links to mini app for real play

**Web App Goals:**
- Landing page (hero, how it works, featured games)
- Free game generator (demo only, limited)
- Learn about writer coins and NFTs
- CTA: "Play with real coins in Farcaster Mini App"

**What to do:**
- Keep web app lightweight and beautiful
- Use it for SEO and marketing
- Direct users to mini app for paid features
- Shared components for UI consistency

### Option B: Unified Full-Featured Experience (Post-MVP)
Web app has payment (via MetaMask/WalletConnect) alongside mini app

**Both environments support:**
- Genre + difficulty customization
- Payment processing (different wallet providers)
- NFT minting
- User profiles and game history
- Shared data (games, transactions)

**Implementation:**
- Extract components to shared lib
- Create abstraction layer for wallet (Farcaster vs. Browser wallets)
- Unified game generation endpoint
- Single database for all games/transactions

## Current Code Duplication

### Duplicated Components
```
/app/mini-app/components/
  - WriterCoinSelector.tsx (mini-app only)
  - ArticleInput.tsx (mini-app only)
  - GameCustomizer.tsx (mini-app only - has genre/difficulty)
  - GamePlayer.tsx (mini-app only - has minting)
  - PaymentButton.tsx (mini-app only)

/domains/games/components/
  - game-generator-form.tsx (web app only)
  - game-grid.tsx (shared?)
```

### Different Endpoints
```
Web app:        /api/games/generate
Mini app:       /api/mini-app/games/generate
```

## Recommended Immediate Actions (MVP Phase)

### 1. Keep Them Separate (Current State) ✅
- Mini app: Full-featured (genre, difficulty, payment, minting)
- Web app: Demo generator + marketing site
- Clear messaging: "For the real experience, open in Farcaster"

**Pros:**
- Minimal changes, ship faster
- Clean separation of concerns
- Mini app can stay focused

**Cons:**
- Users don't see full potential from web
- Duplicated code
- Maintenance burden

### 2. Extract Shared Components (Recommended for Week 5)
Even if kept separate, reduce duplication:

```
/components/shared/
  - ArticleInputField.tsx (generic, no validation)
  - GenreSelector.tsx (reusable)
  - DifficultySelector.tsx (reusable)
  - GamePlayerBase.tsx (render-only, no minting)
  - PaymentFlow.tsx (abstracted)
```

Then:
```
mini-app/components/ArticleInput.tsx
  → wraps ArticleInputField with Paragraph validation

web/components/GameGeneratorForm.tsx
  → wraps ArticleInputField with basic URL validation
```

### 3. Unified Game Generation (Recommended)
Instead of two endpoints, create one flexible endpoint:

```
POST /api/games/generate
{
  "input": {
    "type": "url" | "text",
    "value": "..."
  },
  "customization": {
    "genre": "horror" | "comedy" | "mystery" | undefined,
    "difficulty": "easy" | "hard" | undefined
  },
  "payment": {
    "writerCoinId": "avc" | undefined,
    "transactionHash": "0x..." | undefined
  }
}
```

Both apps use same endpoint:
- Mini app: Sends genre + difficulty + payment
- Web app: Sends undefined for those fields (uses defaults)

## Post-MVP Vision (Weeks 6-8)

Once mini app is proven:

1. **Add browser wallet support** to web app
   - MetaMask, Coinbase Wallet, WalletConnect
   - Same payment flow as mini app
   
2. **Unified user accounts**
   - Users can play on web OR mini app
   - Games/NFTs persist across both
   - Single wallet connection
   
3. **One codebase for UI**
   - Shared component library
   - Wallet abstraction layer
   - Responsive design works everywhere

4. **Growth strategy**
   - Web app: Marketing, SEO, onboarding
   - Mini app: Core community, sharing
   - Cross-platform value unlock

## Implementation Priority

**MVP (Week 5):** Keep separate, but extract shared components
**Post-MVP (Weeks 6-7):** Add browser wallet to web app
**Phase 2 (Weeks 8+):** Full unification with shared data layer

## Conclusion

**For now:** The divergence is acceptable because they serve different purposes:
- Mini app: Premium, Farcaster-native, monetized
- Web app: Marketing, demo, free play

**However:** Extract shared UI components early to reduce tech debt and make future unification easier.

**Key recommendation:** Create `/components/shared/` and move reusable pieces there, even if the apps stay architecturally separate.
