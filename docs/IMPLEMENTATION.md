# WritArcade Implementation Guide

## MVP Focus

**Vision**: Build a Farcaster Mini App that gives Paragraph writer coins real utility by turning articles into playable, mintable games.

**Launch with**: AVC ($AVC), + 2 TBD writer coins

### Current State Analysis

#### ✅ Existing Foundation (Infinity Arcade)
- Article-to-game AI generation pipeline (reusable)
- Interactive game streaming (works in browser)
- User authentication (extends to wallet auth)

#### 🎯 MVP Additions (WritArcade)
- **Farcaster Mini App SDK**: Full-screen app in Farcaster
- **Paragraph Integration**: Fetch articles, validate author
- **Writer Coin Payments**: Multi-token ERC-20 support via Farcaster Wallet
- **Writer Coin Whitelist**: AVC + 2 more, configurable per writer
- **Base NFTs**: Mint games as ERC-721 tokens with writer coin metadata
- **Token Distribution**: Per-writer revenue split (60% writer, 20% platform, 20% community)

## Implementation Phases (MVP: 5 Weeks)

### Phase 1: Mini App + Farcaster (Weeks 1-2)

#### Week 1: Mini App SDK Setup
- [ ] Create Farcaster Mini App with `@farcaster/mini-app` SDK
- [ ] Set up Farcaster Wallet auth
- [ ] Basic layout: header + content area + footer
- [ ] Deploy stub app to Vercel
- [ ] Verify app loads in Farcaster

#### Week 2: Article Input & Fetching
- [ ] Add URL input component
- [ ] Validate Paragraph URL format
- [ ] Fetch article via Paragraph API (or simple HTTP GET)
- [ ] Extract title + body content
- [ ] Display article preview to user
- [ ] Handle errors gracefully

**Tech Stack**:
- Farcaster Mini App SDK
- Viem for wallet interaction
- Simple fetch/axios for article scraping

### Phase 2: Game Generation (Week 3)

#### Week 3: Customization + Generation
- [ ] Genre selector dropdown (Horror/Comedy/Mystery)
- [ ] Difficulty selector (Easy/Hard)
- [ ] "Generate Game" button
- [ ] Call existing game generation service
- [ ] Stream AI response back to user
- [ ] Render playable game in-app
- [ ] Retry/error handling

**Reuses existing**: Game generation pipeline from Infinity Arcade

### Phase 3: DEGEN Payments (Week 4)

#### Week 4a: Smart Contracts
- [ ] Write minimal GamePayment.sol (simple ERC-20 transfer)
- [ ] Write minimal GameNFT.sol (standard ERC-721)
- [ ] Deploy to Base Sepolia testnet
- [ ] Test with test DEGEN tokens

#### Week 4b: Payment Integration
- [ ] Add "Pay with DEGEN" button
- [ ] Trigger Farcaster Wallet approval flow
- [ ] Verify DEGEN balance before generation
- [ ] Emit payment event
- [ ] Confirm on-chain before generating game
- [ ] Handle rejected/failed payments

**Contracts**: ~200 LOC total, no custom logic

### Phase 4: NFT Minting + Launch (Week 5)

#### Week 5a: NFT Minting
- [ ] Post-game: "Mint as NFT" button
- [ ] Generate metadata (JSON + image)
- [ ] Call GameNFT.mintGame() contract
- [ ] Display transaction status
- [ ] Show minted NFT details

#### Week 5b: Polish & Launch
- [ ] Fix bugs from testing
- [ ] Optimize image generation
- [ ] Deploy to Farcaster production
- [ ] Write launch post for Farcaster
- [ ] Gather feedback from early users

**Database Schema**: Minimal
```typescript
// Game record
{
  id: string
  walletAddress: string
  writerCoinAddress: string  // Which writer coin was used
  articleUrl: string
  articleAuthor: string      // Validated against writer coin
  genre: 'horror' | 'comedy' | 'mystery'
  difficulty: 'easy' | 'hard'
  gameContent: string        // AI output
  nftTokenId?: number        // If minted
  createdAt: Date
}
```

## Technical Architecture (MVP)

### Frontend Stack
- **Mini App Framework**: `@farcaster/mini-app` SDK
- **Framework**: Next.js 16 (existing)
- **Language**: TypeScript
- **Styling**: TailwindCSS (existing design system)
- **Wallet**: Farcaster Wallet SDK (built into Mini App)
- **HTTP Client**: Fetch/axios for article scraping

### Backend Stack
- **API**: Next.js API routes
- **Database**: PostgreSQL with Prisma (existing)
- **Game Generation**: Existing Infinity Arcade pipeline
- **AI Services**: OpenAI GPT-4o Mini (for cost efficiency)

### Onchain Stack
- **Blockchain**: Base only
- **Smart Contracts**: 
  - WriterCoinPayment.sol (~150 lines, multi-token support)
  - GameNFT.sol (~100 lines, standard ERC-721)
- **Writer Coins**: 
  - $AVC (0x06FC3D5D2369561e28F261148576520F5e49D6ea)
  - Writer Coin #2 (TBD)
  - Writer Coin #3 (TBD)
- **Wallet Interaction**: Farcaster Wallet built-in

### Infrastructure
- **Deployment**: Vercel (existing)
- **Database**: Existing PostgreSQL
- **Monitoring**: Existing logs

**No new infrastructure needed for MVP.**

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

### Phase 2 Entry (Validation)
- [ ] 500+ users without paid marketing
- [ ] 1000+ games generated
- [ ] Clear product-market fit signals
- [ ] Positive sentiment in Farcaster community

## Risk Mitigation (MVP)

### Technical Risks
- **Farcaster Wallet Integration**: Test heavily in Sepolia first
- **Article Scraping**: Fallback to manual input if Paragraph API fails
- **Gas Costs**: Use Base (low fees) + batch operations

### Market Risks
- **Adoption**: Start with Farcaster Mini Apps dev group
- **Retention**: Gather feedback early, iterate quickly

### Execution Risks
- **Timeline**: 5 weeks assumes existing game generation works
- **Scope Creep**: Keep Phase 1 to 2 choices (genre/difficulty only)
- **Dependencies**: No external API dependencies except Paragraph

## Current Progress Summary

### ✅ Completed: Wallet-Based Authentication System

#### 1. **Web3 Infrastructure Setup**
- ✅ Installed and configured Wagmi v2 + RainbowKit
- ✅ Created `Web3Provider` with Base and Base Sepolia support
- ✅ Custom `WalletConnect` component with branded styling
- ✅ Integrated with existing app layout

#### 2. **Authentication Flow**
- ✅ `/api/auth/wallet` - Wallet authentication endpoint
- ✅ `WalletSync` component - Auto-syncs wallet state with backend
- ✅ Hybrid auth system (wallet + legacy token support)

#### 3. **User Interface Updates**
- ✅ Updated `UserMenu` to use Wagmi hooks
- ✅ Displays wallet address and connection status
- ✅ Shows network/chain information
- ✅ Disconnect functionality

#### 4. **User Profile & Preferences**
- ✅ Created `UserProfileForm` component
- ✅ `/api/user/profile` - Update user preferences
- ✅ Settings: username, AI model, privacy toggle

## Setup Requirements

1. **Configure PostgreSQL Database**
   ```bash
   # Update .env with your database URL
   DATABASE_URL="postgresql://user:pass@localhost:5432/writarcade"
   ```

2. **Sync Database Schema**
   ```bash
   npx prisma db push
   # or for production
   npx prisma migrate dev --name init
   ```

3. **Get WalletConnect Project ID**
   - Visit: https://cloud.walletconnect.com/
   - Create a project
   - Update `components/providers/Web3Provider.tsx` line 17

4. **Add API Keys to `.env`**
   ```bash
   OPENAI_API_KEY="sk-..."
   ANTHROPIC_API_KEY="sk-ant-..."
   ```

### Next Steps (Week 3 Continuation)

#### Phase 2.1: Game Ownership
- [ ] Link games to wallet addresses
- [ ] Update game creation flow to associate with user
- [ ] Add "My Games" filtering by wallet
- [ ] Private/public game visibility controls

#### Phase 2.2: Enhanced User Experience
- [ ] User profile page with game history
- [ ] Wallet-based game access control
- [ ] Save game preferences per user
- [ ] Game sharing and permissions

*Last Updated: 2025-11-24*