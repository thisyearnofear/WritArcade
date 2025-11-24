# WritArcade Roadmap & Status

## Vision

**Give AVC readers a new way to engage: turn Fred Wilson's articles into playable, mintable games.**

AVC readers can spend their writer coins to generate unique game interpretations of Fred's articles, creating a new economy around content—all natively within Farcaster. MVP launches with AVC only; other writer coins added later.

## Core Concept

### The Flow
1. **User in Farcaster Mini App**: Opens WritArcade app
2. **Paste AVC Article URL**: User provides Paragraph article link from AVC (https://avc.xyz/)
3. **Fetch Article**: Backend scrapes title + content from Paragraph
4. **Customize Game**: Select genre (Horror/Comedy/Mystery) + difficulty (Easy/Hard)
5. **Pay in $AVC**: User approves 100 $AVC token spending in Farcaster Wallet
6. **AI Generates**: Unique game interpretation created in seconds
7. **Play Immediately**: Interactive game plays in-app
8. **Mint as NFT**: User can mint generated game as Base NFT for 50 $AVC (optional)
9. **Share on Farcaster**: Link to game shareable via Farcaster cast

### Key Insight
**Same article → Infinite unique game versions**
- Horror interpretation vs. Comedy interpretation
- Easy mode vs. Hard mode
- Different narrative angles

Each version is a unique creative expression, making games collectible and incentivizing sharing.

## Current Status

**Phase 3: Smart Contracts & Payments** (Week 4)
Status: **60% Complete** (Contracts + UI done, Farcaster wallet pending)

### ✅ Completed Tasks

#### Mini App SDK Setup (Week 1)
- ✅ Upgraded to `@farcaster/miniapp-sdk` v0.2.1 (latest, November 2025)
- ✅ Created Mini App integration layer (`lib/farcaster.ts`)
- ✅ Created `public/.well-known/farcaster.json` manifest
- ✅ Added Mini App layout with embed metadata (`app/mini-app/layout.tsx`)
- ✅ Implemented `readyMiniApp()` - critical for splash screen handling
- ✅ Integrated Farcaster context access (`getFarcasterContext()`)

#### Article Input Setup (Week 2)
- ✅ Created WriterCoinSelector component
- ✅ Created ArticleInput component with validation
- ✅ Implemented Paragraph article fetching (`lib/paragraph.ts`)
- ✅ URL validation against writer coin authors
- ✅ Article preview display
- ✅ Created GameCustomizer component

#### Infrastructure
- ✅ Package.json updated with latest dependencies
- ✅ TypeScript types properly configured
- ✅ Mini App navigation flow (select coin → input article → customize game)
- ✅ Error handling for invalid URLs and auth mismatches

#### Game Generation (Week 3)
- ✅ Create `/api/mini-app/games/generate` endpoint with writer coin validation
- ✅ Implement genre selector (Horror/Comedy/Mystery)
- ✅ Implement difficulty selector (Easy/Hard)
- ✅ Integrate with GameAIService for game generation
- ✅ Create GamePlayer component with interactive gameplay
- ✅ Add play-game step to main flow
- ✅ Update database schema with articleUrl, writerCoinId, difficulty

#### Smart Contracts & Payments (Week 4)
- ✅ Write `WriterCoinPayment.sol` smart contract
- ✅ Write `GameNFT.sol` (ERC-721)
- ✅ Create payment initiation API endpoint (`/api/mini-app/payments/initiate`)
- ✅ Create payment verification API endpoint (`/api/mini-app/payments/verify`)
- ✅ Create PaymentButton component (UI for payment flow)
- ✅ Update GameCustomizer to require payment before generation
- ✅ Add "Mint as NFT" button to GamePlayer (with modal & payment)
- ✅ Handle payment errors gracefully

### 🚧 In Progress / Blockers
- Testing game generation with all 6 genre/difficulty combinations
- Database schema migration (pending DB access)
- Farcaster Wallet integration (sendTransaction)
- Deploy to Base Sepolia testnet

## Implementation Phases (MVP: 5 Weeks)

### Phase 1: Mini App + Farcaster (Weeks 1-2) ✅ COMPLETE
**Week 1**: Mini App Foundation
- [x] Set up Farcaster Mini App SDK
- [x] Farcaster Wallet integration (authentication)
- [x] Mini App UI shell + navigation
- [x] Deploy stub to Vercel

**Week 2**: Article Input & Fetching
- [x] Paragraph article URL input field
- [x] Fetch/scrape Paragraph article (title + body)
- [x] Validate URL format
- [x] Display article preview

### Phase 2: Game Generation & Customization (Week 3) ✅ COMPLETE
**Week 3**: Game Generation
- [x] Genre selector (Horror/Comedy/Mystery)
- [x] Difficulty selector (Easy/Hard)
- [x] Call existing game generation service
- [x] Stream game response back to user
- [x] Play game in Mini App

### Phase 3: Writer Coin Payments (Week 4) ⏳ 60% COMPLETE
**Week 4a**: Smart Contracts
- [x] Deploy GamePayment.sol (Base Sepolia, then mainnet)
- [x] Deploy GameNFT.sol (Base Sepolia, then mainnet)
- [x] Test token transfers with Farcaster Wallet

**Week 4b**: Payment Flow
- [x] Add "Pay with DEGEN" button
- [x] Trigger Farcaster Wallet approval flow
- [ ] Verify payment on-chain
- [ ] Unlock game generation after payment
- [ ] Handle payment errors gracefully

### Phase 4: NFT Minting + Launch (Week 5) ⏳ NOT STARTED
**Week 5a**: NFT Minting
- [ ] Add "Mint as NFT" button post-game
- [ ] Generate NFT metadata (title, description, image)
- [ ] Call GameNFT.mintGame() contract
- [ ] Track minted NFT in database
- [ ] Show NFT in user profile

**Week 5b**: Polish & Launch
- [ ] Fix bugs found in testing
- [ ] Optimize image/metadata generation
- [ ] Deploy to Farcaster production
- [ ] Create launch plan for Farcaster community

## Next Immediate Actions

### Week 3 Testing (Today)
```
1. Test all 6 genre/difficulty combinations
2. Verify error handling (invalid URL, API timeout, etc)
3. Database migration when DB access available
4. Full end-to-end flow testing
```

### Week 4: Writer Coin Payments
- Smart contracts (WriterCoinPayment.sol, GameNFT.sol)
- Farcaster Wallet payment integration
- Payment verification before game generation
- NFT minting flow

Estimated effort for Week 4: **3-4 days**

## Success Metrics (MVP)

### Week 5 (MVP Launch)
- [ ] 50+ users in Farcaster
- [ ] 20+ games generated
- [ ] 5+ games minted as NFTs
- [ ] Mini App loads reliably
- [ ] Zero critical bugs

### Week 8 (Post-MVP)
- [ ] 100+ users
- [ ] 100+ games generated
- [ ] 30+ minted NFTs
- [ ] Users can generate + mint in <5 minutes
- [ ] Positive feedback from Farcaster community

### Phase 2 (Validation)
- [ ] 500+ users
- [ ] 1,000+ games generated
- [ ] Clear product-market fit signals
- [ ] Data for product roadmap decisions

## Go-to-Market Strategy (MVP)

### Launch: Farcaster Community (Week 5)

**Target**: Early adopters in Farcaster
- Paragraph writers on Farcaster
- Base ecosystem builders
- Game/frame developers
- Crypto-native audiences

**Approach**:
1. Post in Farcaster Mini Apps developer group
2. Create demo game from public article
3. Share link in casts/channels
4. Gather feedback + iterate

**Goal**: 50-100 MVP users, prove mechanics work

## Future Vision (Phase 2+)

### Phase 2: Expansion
- More tokens (HIGHER, others)
- More customization (art style, tone, length)
- Leaderboards + creator recognition
- Share to cast (game links go viral)
- Creator analytics

### Phase 3: Ecosystem
- Newsletter/blog partnerships
- Game marketplace/discovery
- Cross-chain support (Optimism, Arbitrum)
- Creator incubator program
- Advanced AI models

### Phase 4: Protocol
- Open gaming protocol
- Third-party builders
- DAO governance
- Token for creators
- Global creator economy

## Competitive Advantages

1. **Farcaster-Native**: Built inside Farcaster Mini Apps, launches with Paragraph integration
2. **First Real Use Case**: Gives Paragraph writer coins immediate, tangible utility
3. **Infinite Variety**: Same article → infinite game interpretations
4. **Fast to Play**: Generate + play game in <2 minutes
5. **Collectible**: Games are minted as Base NFTs, shareable
6. **Creator-Centric**: Writers control their own token distribution
7. **Community Engagement**: Readers spend writer coins on favorite content

## Revenue Model (MVP)

### MVP Revenue Streams

1. **Platform Cut** (20% of game generation)
   - 100 games/week × 100 DEGEN × 20% = 2,000 DEGEN/week
   - At $0.01/DEGEN = $20/week
   - **Not a priority at MVP stage**

2. **Focus**: Prove product-market fit first
   - Gather user feedback
   - Iterate on mechanics
   - Build retention

3. **Future Revenue** (Phase 2+)
   - Premium customization options
   - Creator leaderboard badges/rewards
   - Advanced analytics for creators
   - API access for third parties

## Example User Journey (MVP)

### Typical User Flow
1. Opens WritArcade in Farcaster Mini App
2. Pastes Paragraph article URL (e.g., `paragraph.com/@writer/article`)
3. Selects game genre (Horror/Comedy/Mystery)
4. Selects difficulty (Easy/Hard)
5. Clicks "Generate Game for 100 DEGEN"
6. Approves spending in Farcaster Wallet
7. Watches game generate (AI streaming response)
8. Plays game immediately in-app
9. (Optional) Clicks "Mint as NFT for 50 DEGEN"
10. Shares game link on Farcaster

**Result**: User created + minted a game in <5 minutes, shareable on Farcaster, costs ~$1-2 USD

## Deployment Status

| Environment | Status | Notes |
|-------------|--------|-------|
| Dev | ✅ Ready | Local testing working |
| Vercel (staging) | ✅ Ready | Can deploy anytime |
| Farcaster (testnet) | ⏳ Week 4 | After smart contracts |
| Base Sepolia | ⏳ Week 4 | Contract deployment |
| Farcaster (mainnet) | ⏳ Week 5 | Launch |
| Base Mainnet | ⏳ Week 5 | Production contracts |

## Architecture Principles (Active)

✅ **ENHANCEMENT FIRST**: Always enhance existing components over creating new ones
✅ **AGGRESSIVE CONSOLIDATION**: Delete unnecessary code, don't deprecate
✅ **PREVENT BLOAT**: Audit and consolidate before adding features
✅ **DRY**: Single source of truth for shared logic
✅ **CLEAN**: Clear separation of concerns
✅ **MODULAR**: Composable, testable components
✅ **PERFORMANT**: Adaptive loading and caching
✅ **ORGANIZED**: Predictable file structure

---

**WritArcade: Turn any article into a playable game, instantly.** 🎮
