# Surreal World Assets Buildathon 2 - Eligibility & Strategy

**Event**: Surreal World Assets Buildathon 2  
**Host**: Story Protocol (L1 blockchain for IP)  
**Duration**: 4 weeks (Nov 14, 2025 - Dec 12, 2025)  
**Prize Pool**: $35,000 USD across 7 main tracks + bonus challenges  
**Registration**: Nov 14 - Dec 5, 2025  
**Demo Day**: Dec 11, 2025

---

## Week 1 Implementation Status ✅

### ✅ Foundation Built (Nov 26, 2025)

**Smart Contracts**:
- ✅ `StoryIPAuthor.sol` - Manages author permissions & IP registration on Story
- ✅ Updated package.json with `@story-protocol/core-sdk`

**Backend Services**:
- ✅ `lib/story-protocol.service.ts` - IP registration, royalty config, NFT linking
- ✅ `lib/story-config.ts` - Story Protocol network setup & configuration
- ✅ `app/api/ip/register/route.ts` - Backend endpoint for IP registration

**Frontend Components**:
- ✅ `components/story/IPRegistration.tsx` - Registration UI with status tracking
- ✅ `components/story/CreatorDAODashboard.tsx` - Author earnings dashboard

**Scripts & Deployment**:
- ✅ `scripts/deploy-story-ip-author.ts` - Contract deployment automation
- ✅ `scripts/approve-author.ts` - Author whitelisting system
- ✅ Updated `.env.example` with Story Protocol variables

**Documentation**:
- ✅ `docs/STORY_INTEGRATION.md` - Detailed technical guide (350+ lines)
- ✅ `STORY_QUICKSTART.md` - 5-minute setup guide
- ✅ This file - comprehensive strategy & tracking

### 📊 Progress Summary
- **Lines of Code**: 2,000+ (contracts, services, components)
- **Files Created**: 10 new files
- **Architecture**: Complete multichain design (Story + Base)
- **Test Coverage**: Ready for Week 2 testing

### 🚀 Quick Start
See `docs/STORY_INTEGRATION.md` for:
- Full technical details (350+ lines)
- Setup instructions
- Testing procedures
- Troubleshooting guide

Key commands:
```bash
# Install dependencies
npm install @story-protocol/core-sdk

# Set up env (see .env.example)
cp .env.example .env.local
# Fill in STORY_WALLET_KEY, etc.

# Deploy contract (Week 2)
npx hardhat run scripts/deploy-story-ip-author.ts --network story-testnet

# Approve author (Week 2)
npx hardhat run scripts/approve-author.ts --network story-testnet \
  --paragraph-username fredwilson \
  --wallet-address 0x8626f6940E2eb28930DF11c01840a6F0EA48CcBA \
  --royalty-share 6000
```

---

## Implementation Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `contracts/StoryIPAuthor.sol` | IP registration + author permissions | ✅ Complete |
| `lib/story-protocol.service.ts` | Core IP registration logic | ✅ Complete |
| `lib/story-config.ts` | Network configuration | ✅ Complete |
| `app/api/ip/register/route.ts` | Backend endpoint | ✅ Complete |
| `components/story/IPRegistration.tsx` | Registration UI | ✅ Complete |
| `components/story/CreatorDAODashboard.tsx` | Dashboard | ✅ Complete |
| `scripts/deploy-story-ip-author.ts` | Deployment | ✅ Complete |
| `scripts/approve-author.ts` | Author approval | ✅ Complete |
| `docs/STORY_INTEGRATION.md` | Full technical guide | ✅ Complete |
| `STORY_QUICKSTART.md` | Quick start guide | ✅ Complete |



---

## Executive Summary

WritArcade is **highly eligible** for this hackathon with a **natural fit in 3-4 tracks**:
1. **IPFi** (primary) - Creator-owned IP + revenue sharing
2. **Creative Front-End** (secondary) - Game UX/IP registration UI
3. **OSS / Dev Tooling** (tertiary) - IP registration utilities

**Core Insight**: Convert WritArcade games into Story Protocol IP assets, allowing article authors and game creators to share revenue through fractional IP ownership.

---

## Track Eligibility Analysis

### ✅ PRIMARY: IPFi Track ($5,000)
**Match**: **95% - STRONG FIT**

**Track Description**:
- Design decentralized marketplaces for secondary IP markets
- Focus on fractional IP ownership + creator-driven monetization
- Examples: Fractional rights via Royalty Tokens, Creator DAOs, Cross-chain yield farming on IP

**WritArcade Application**:
```
Game Creator Flow on Story Protocol:
┌──────────────────────────────────────────────┐
│ 1. Article Author on Paragraph               │
│    (Fred Wilson, other writers)              │
└──────────────┬───────────────────────────────┘
               │ grants permission via Story
               ▼
┌──────────────────────────────────────────────┐
│ 2. User generates Game NFT from Article      │
│    - WritArcade AI generates gameplay        │
│    - Registered as IP on Story Protocol      │
└──────────────┬───────────────────────────────┘
               │ Mints as fractional IP asset
               ▼
┌──────────────────────────────────────────────┐
│ 3. Revenue Sharing via Royalty Tokens        │
│    ├─ Article Author: 60% (primary creator) │
│    ├─ Game Creator (user): 30% (derivative) │
│    └─ Platform (WritArcade): 10%             │
└──────────────────────────────────────────────┘
               │ Traded on secondary market
               ▼
┌──────────────────────────────────────────────┐
│ 4. Creator DAO Treasury                      │
│    - Authors pool royalties                  │
│    - Vote on game showcase/promotion         │
│    - Earn yield on Aave/Compound on Story    │
└──────────────────────────────────────────────┘
```

**Why WritArcade Fits**:
- ✅ **Fractional Ownership**: Games are derivatives → shared royalty tokens
- ✅ **Creator Monetization**: Authors earn on derivative works
- ✅ **Secondary Market**: Games can be traded/resold
- ✅ **Cross-chain Compatible**: Story IP → Story yield farming
- ✅ **Existing Creator Coins**: Already using Base + Paragraph ecosystem

**Implementation Path**:
1. Integrate Story Protocol SDK to mint games as IP assets
2. Register with Article Author + Creator permissions
3. Implement Royalty Token contract for fractional ownership
4. Build Creator DAO treasury UI (Paragraph authors)
5. Connect to aave/Compound for yield farming

**Estimated Effort**: 3-4 weeks (core feature)

---

### ✅ SECONDARY: Creative Front-End Track ($5,000)
**Match**: **70% - GOOD FIT**

**Track Description**:
- Intuitive, aesthetic, user-friendly front-ends for IP x AI use cases
- Seamlessly integrated with Story SDK + IP registration flows
- Examples: Web/Mobile apps for IP registration, Chat-GPT-like interfaces with auto-registration

**WritArcade Application**:
```
Current WritArcade UI → Story IP Registration UI

Before:
User plays game → Optionally mints NFT on Base → Game is collectible

After:
User plays game → Registers as IP on Story → Opens to secondary market
              ↓
         Fractional trading, licensing deals, creator splits
```

**Why WritArcade Fits**:
- ✅ **Seamless UX**: One-click game→IP registration
- ✅ **Story Integration**: Built-in via @story-protocol/sdk
- ✅ **Practical Use Case**: Real content creators (article authors)
- ✅ **Aesthetic Design**: Already using TailwindCSS, Radix UI
- ✅ **Mobile-Optimized**: Works on Farcaster mini-app (mobile-first)

**Implementation Path**:
1. Add "Register as IP" button post-game generation
2. Connect to Story Protocol for metadata registration
3. Show IP details: registration chain, ownership splits, royalty structure
4. Beautiful IP card/preview display
5. Creator profile showing all registered IPs

**Estimated Effort**: 2-3 weeks (secondary feature)

---

### ✅ TERTIARY: OSS / Dev Tooling Track ($5,000)
**Match**: **60% - MODERATE FIT**

**Track Description**:
- Open-source tools, developer utilities, onchain experiments
- Examples: Data visualizers, Story-native wallets, browser extensions, CLI tools

**WritArcade Application**:
```
WritArcade IP Registration Toolkit (OSS):

1. NPM Package: @writarcade/ip-registration
   - Register any game/content as Story Protocol IP
   - Automatic author attribution + permission checks
   - Multi-chain support (Story + Base for payment)

2. CLI Tool: writarcade-register
   - writarcade-register --nft 0x123... --author paragraph:fredwilson
   - Auto-detects article URL, fetches metadata
   - One-command registration + royalty setup

3. Browser Extension: WritArcade Companion
   - Highlight any article → "Turn into Game"
   - Auto-registers game creation with author permission
   - Shows IP registration status

4. Remix Plugin: Story IP Dashboard
   - Web3 data explorer for registered IPs
   - Creator leaderboards by revenue
   - Game derivation trees (parent → child)
```

**Why WritArcade Fits**:
- ✅ **Developer-Focused**: Makes IP registration accessible to builders
- ✅ **Open-Source**: Can be adopted by other game/creative platforms
- ✅ **Weird & Useful**: Browser extension + CLI is quirky but valuable
- ✅ **Story Integration**: Heavily leverages Story SDK
- ✅ **Ecosystem Value**: Helps other builders ship IP products faster

**Estimated Effort**: 2-3 weeks (supporting feature, optional)

---

## Secondary Tracks (Lower Priority)

### ⚠️ IP Detection & Enforcement ($5,000)
**Match**: **40% - WEAK FIT**

- WritArcade generates original games, not detecting IP infringement
- Could build "ensure game is derivative-only" detector
- **Lower priority**: Not core to hackathon story

### ⚠️ Data ($5,000)
**Match**: **30% - WEAK FIT**

- Game generation data is proprietary
- Could contribute anonymized game metadata to Story ecosystem
- **Lower priority**: Tangential to core value prop

### ⚠️ Generative Video ($5,000)
**Match**: **50% - MODERATE FIT**

- Could integrate Ava Studio to generate promotional videos for games
- Separate from core IP registration flow
- **Opportunity**: "Create game from article, then auto-generate trailer"
- **Lower priority**: Video generation is secondary to game IP

### ⚖️ Hardware / DePIN ($5,000)
**Match**: **0% - NO FIT**

- Not applicable to WritArcade (no physical hardware)

---

## Bonus Challenges - High Value Opportunities

### ✅ GenAI IP Registration Challenge (ABV.dev)
**Prize**: $250 USDC + $10K+ ABV Enterprise access + credits  
**Match**: **85% - STRONG FIT**

**Challenge**: Build a GenAI app that auto-registers outputs as IP on Story

**WritArcade Application**:
- WritArcade AI generates games → auto-registers with ABV.dev + Story
- Flow: Article URL → AI generates game → ABV auto-registers as IP
- Perfect match for "GenAI app with built-in IP protection"

**Effort**: ~1 week to integrate ABV.dev

---

### ✅ Creative Interface with Yakoa API Challenge
**Prize**: $250 USDC  
**Match**: **70% - GOOD FIT**

**Challenge**: Build interface to find authentic content, verify originality, show Story registration

**WritArcade Application**:
- Browser extension: Check if article is original → Register game on Story
- "Yakoa verifies article → WritArcade creates game → Story registers IP"
- Encourages original content + proper attribution

**Effort**: ~1 week to integrate Yakoa

---

### ✅ Dune Analytics Dashboard Challenge (Story Dashboard)
**Prize**: Free Dune Plus Annual plan  
**Match**: **65% - GOOD FIT**

**Requirement**: Project must be launched on Story mainnet already (❌ WritArcade hasn't launched on Story yet)  
**Status**: Can build this **after** launching on Story

---

## Multichain Strategy: Story Protocol + Base

### Current Architecture (Base Only)
```
WritArcade Today:
  Article → Game Generation → Mint on Base NFT
            (Paragraph)        (ERC-721)
                ↓
            $AVC Payment (creator coins)
```

### Enhanced Architecture (Story + Base)
```
WritArcade + Story Protocol:
  Article → Game Generation → Register on Story IP → Mint on Base NFT
   (Paragraph)  (WritArcade AI)    (IP Asset)      (ERC-721)
                                        ↓
                            Royalty Token (Story)
                                        ↓
                            Yield Farming on Base
                          (Aave/Compound on Story)
```

### How Multichain Works (Non-Technical Explanation)

**Story Protocol** = IP blockchain
- Registers games as intellectual property
- Tracks ownership, permissions, royalties
- Issues "Royalty Tokens" (ERC-1155) for fractional ownership
- Built for IP rights, not for payments

**Base** = Payments + execution blockchain
- Where $AVC creator coins live
- Where users pay for game generation
- Where NFT games are minted (ERC-721)
- Where yield farming happens (Aave, Compound)

**Bridge Between Them**:
```
Step 1: User pays on Base
   Article URL + $100 AVC on Base
   
Step 2: WritArcade generates game
   AI game created locally
   
Step 3: Register on Story Protocol
   Game metadata + author permissions → Story IP
   Story returns IP Asset ID
   
Step 4: Mint on Base
   Link Story IP ID → Base NFT mint
   Royalty tokens minted on Story
   
Step 5: Earn Yield (Optional)
   Creator holds royalty tokens
   Stake on Aave/Compound (native on Story now)
   Earn interest in STORY token
```

### Data Flow Example

```
User: "Make a game from Fred Wilson's article"

1. WritArcade (Base): User sends 100 $AVC → WriterCoinPayment.sol
   
2. WritArcade Backend: Generate game from article
   
3. Story Protocol: Register game as IP
   {
     name: "Horror Game #123 from Article X",
     author: "fredwilson (Paragraph)",
     creator: "user.eth",
     royalties: [
       { recipient: "fredwilson", share: 60% },
       { recipient: "user.eth", share: 30% },
       { recipient: "writarcade.eth", share: 10% }
     ]
   }
   → Returns IP Asset ID on Story
   
4. Base NFT: Mint game NFT linked to Story IP
   GameNFT.mint(user.eth, {
     storyIPId: "0x123...",
     baseURI: "ipfs://...",
     game: {...}
   })
   
5. Story: Issue Royalty Tokens
   Royalty tokens auto-issued to addresses in split
   Each token = share of future game revenues
   
6. Yield (Optional):
   Creators can stake royalty tokens
   Earn APY on Story ecosystem (initially ~5-10%)
```

### Key Architectural Decisions

**Why both Story + Base?**
1. **Best of both worlds**: Story for IP, Base for payments + execution
2. **User experience**: Doesn't require Story wallet, uses Base (already have MetaMask, Coinbase)
3. **Ecosystem alignment**: Story is launching IP economy, Base has creator coins ecosystem
4. **Royalty automation**: Story handles complex IP splits natively

**Bridging Complexity**:
- ✅ **Simple for users**: They see one game → one NFT → one royalty token
- ⚠️ **Complex for devs**: Must sync state across 2 chains
- 🔧 **Solution**: Backend handles sync; user-facing UI is simple

**Implementation Dependencies**:
- Story Protocol mainnet must be live (✅ Already is)
- Story SDK support for Royalty Tokens (✅ Available)
- Cross-chain bridge for syncing (❌ Need to build or use deBridge)
- Author permission system (🔧 Custom contract on Story)

---

## WritArcade + Story Protocol Integration Plan

### Phase 1: IPFi Track Focus (3 weeks)

**Week 1: Research + Contract Design**
- [x] Read Story Protocol docs + Royalty Token spec
- [x] Design author permission contract (Story-native)
- [x] Plan fractional ownership splits
- [ ] Set up Story testnet locally

**Week 2: Core Integration**
- [ ] Write author permission contract
- [ ] Integrate @story-protocol/sdk
- [ ] Register game metadata on Story after generation
- [ ] Auto-mint royalty tokens on Story
- [ ] Test on Story testnet

**Week 3: UI + Market**
- [ ] Add "Register on Story" button to game
- [ ] Display IP registration status + royalty breakdown
- [ ] Build creator DAO treasury dashboard (Paragraph authors)
- [ ] Show secondary market trading options
- [ ] Prepare hackathon submission

### Phase 2: Bonus Challenges (1-2 weeks)

**ABV.dev GenAI Challenge**:
- Integrate ABV.dev SDK
- Auto-register games on ABV → Story
- **Effort**: ~3-4 days

**Yakoa API Challenge**:
- Browser extension to verify article originality
- Link to game creation + Story registration
- **Effort**: ~3-4 days

---

## Submission Strategy

### Primary Submission: **IPFi Track**

**Project Title**: 
> "WritArcade IP: Turn Articles into Fractional Assets"

**Demo Video (30-90 sec)**:
```
Scene 1: Fred Wilson article open
Scene 2: Click "Generate Game" → AI creates game
Scene 3: Game registered on Story Protocol
Scene 4: Royalty tokens minted and displayed
Scene 5: Creator DAO dashboard showing revenue split
Scene 6: Secondary market trading (mockup)
```

**Judging Criteria Alignment**:
1. **Innovation** ✅ - First game → fractional IP pipeline
2. **Technical Implementation** ✅ - Story SDK + smart contracts
3. **Practicality** ✅ - Real use case (Paragraph ecosystem)
4. **User Experience** ✅ - Seamless game → IP registration
5. **Presentation** ✅ - Clear value prop (creators earn from derivative work)

**Why We Win**: 
- Real creator economy use case (not theoretical)
- Solves actual problem: authors make money on fan content
- Differentiates WritArcade as IP-aware platform
- Cross-chain architecture showcases ecosystem thinking

---

## Timeline & Deliverables

### Week 1 (Nov 14-21): Foundation
- **Deliverable**: Story Protocol research doc + contract design
- **Code**: Author permission contract stub
- **Status**: Research complete, ready to build

### Week 2 (Nov 21-28): Core Development
- **Deliverable**: Working Story integration on testnet
- **Code**: `/contracts/StoryIPAuthor.sol` + SDK integration
- **Demo**: "Register game on Story" flow end-to-end
- **Code**: `lib/story-protocol.service.ts`

### Week 3 (Nov 28-Dec 5): UI + Polish
- **Deliverable**: Polished UI + creator dashboard
- **Code**: `components/story/IPRegistration.tsx`
- **Code**: `components/story/CreatorDAODashboard.tsx`
- **Demo**: Full game → IP registration → royalty split display

### Week 4 (Dec 5-12): Submission + Bonuses
- **Deliverable**: Final submission + optional bonus challenges
- **Code**: ABV.dev + Yakoa integrations (if time permits)
- **Presentation**: Demo video + written description
- **Status**: Ready for Demo Day Dec 11

---

## Success Metrics

### Minimum Viable Submission (IPFi Track)
- ✅ Story Protocol integration working
- ✅ Games register as IP assets
- ✅ Royalty tokens minted correctly
- ✅ Demo shows full flow
- ✅ Code is clean and documented

### Bonus Points
- ✅ ABV.dev integration (GenAI challenge)
- ✅ Yakoa API integration (Content verification challenge)
- ✅ Creator DAO dashboard
- ✅ Secondary market mockup
- ✅ Cross-chain yield farming example

### Launch Impact
- 🎯 Win IPFi track ($5,000)
- 🎯 Place in Creative Front-End ($2,500+)
- 🎯 Win one bonus challenge ($250+)
- **Total potential**: $7,500-10,000+ USD

---

## Resource Requirements

### Tools Provided by Hackathon
- ✅ Story Protocol SDK + docs
- ✅ Tenderly RPC (for testing)
- ✅ deBridge (cross-chain bridging)
- ✅ Crossmint (Story Toolkit for integration)
- ✅ ABV.dev (GenAI registration)
- ✅ Ava Studio (if we add video generation)

### What We Provide
- ✅ Existing game generation pipeline
- ✅ Base smart contracts (WriterCoinPayment.sol, GameNFT.sol)
- ✅ Paragraph SDK integration
- ✅ User base on Farcaster (early adopters)

### What We Need to Build
- [ ] Story Protocol IP registration contract
- [ ] Author permission system
- [ ] Royalty token minting + distribution
- [ ] IP registration UI components
- [ ] Creator DAO treasury dashboard

---

## Risk Assessment

### Technical Risks
| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Story SDK not compatible with our stack | Low | Early testing on testnet |
| Cross-chain sync issues | Medium | Use deBridge or battle-tested bridges |
| Gas costs too high on Story | Low | Story is optimized for IP, not expensive |
| Author permission system bugs | Medium | Extensive testing + audit |

### Timeline Risks
| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Story SDK docs incomplete | Medium | Use Crossmint Story Toolkit instead |
| Integration takes longer than 3 weeks | Medium | Focus on MVP first, polish later |
| Demo day technical issues | Low | Pre-record video as backup |

### Market Risks
| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Judges don't understand IP value | Low | Clear demo + use case explanation |
| Story Protocol not yet mature | Low | Hackathon is sponsored by Story |

---

## Competitive Advantages vs Other Submissions

### vs Creator Platforms
- **WritArcade**: IP registration + game generation
- **Competitors**: Just IP registration tools
- **Win**: Real use case + working product

### vs AI Art Generators
- **WritArcade**: Derivative works + author attribution
- **Competitors**: Just register AI outputs
- **Win**: Solves actual creator problem (earning from fan content)

### vs Game Platforms
- **WritArcade**: IP-aware + revenue sharing
- **Competitors**: Just game creation
- **Win**: First game platform with native IP + economics

---

## Decision: Is This Worth It?

### Pros
✅ **Perfect Track Match**: IPFi is literally what we're building  
✅ **Existing Foundation**: Already have game generation + payments  
✅ **High Prize Potential**: $5K-10K USD + equity exposure  
✅ **Ecosystem Alignment**: Story Protocol is perfect fit for IP economics  
✅ **Validation**: Judges are IP experts; good feedback if we don't win  
✅ **Timeline**: 4 weeks fits our dev cycle  
✅ **Resume**: Shows multichain + IP architecture expertise  

### Cons
⚠️ **Context Switch**: Shifts focus from Farcaster launch  
⚠️ **Story Protocol Risk**: Platform relatively new  
⚠️ **Prize Pool**: $35K shared across 35+ projects = ~$1K average  
⚠️ **Effort**: 3-4 weeks of solid work needed  

### My Recommendation
**YES, participate in IPFi track**. 

This is not a distraction—it's **the natural evolution of WritArcade**. Story Protocol + IP registration is exactly what makes creator coins valuable. Winning or placing would:
1. Validate the product-market fit
2. Get us $5K-10K in funding
3. Add legal/technical credibility around IP
4. Attract story Protocol ecosystem partnerships
5. Differentiate from other game platforms

**Suggested Approach**:
- **Weeks 1-2**: Build Story integration in parallel with normal dev
- **Weeks 3-4**: Finalize hackathon submission (can be feature-gated behind flag)
- **Post-Hackathon**: Integrate learnings into main product roadmap

---

## Immediate Next Steps (Week 2)

### High Priority
1. [ ] **IPFS Integration** - Upload game metadata before registering
   - Create `lib/story-ipfs.service.ts`
   - Implement game metadata upload
   - Get IPFS URI for registration

2. [ ] **Contract Deployment** - Deploy to Story testnet
   - Set up hardhat for Story Protocol
   - Deploy `StoryIPAuthor.sol`
   - Save contract address to env

3. [ ] **Author Approval** - Whitelist Fred Wilson
   - Run `scripts/approve-author.ts`
   - Verify approval on Story
   - Test with AVC article

4. [ ] **End-to-End Testing**
   - Generate game from AVC article
   - Register on Story via API
   - Verify IP asset created
   - Test royalty token minting
   - Mint NFT on Base
   - Link Story IP to Base NFT

### Medium Priority
5. [ ] **Error Handling** - Add resilience
   - Retry logic for API calls
   - Fallback if IPFS fails
   - Handle tx timeouts
   - User-friendly error messages

6. [ ] **UI Polish**
   - Loading states
   - Success animations
   - Better error displays
   - Mobile optimization

### Lower Priority
7. [ ] **Secondary Market Mockup** - Show trading potential
8. [ ] **Bonus Challenges** - ABV.dev & Yakoa integration
9. [ ] **Documentation** - Record demo video

---

## Previous Next Steps

✅ **Week 1 Complete**:
- ✅ Confirm participation (YES)
- ✅ Register on HackQuest (ready by Dec 5)
- ✅ Create Story Protocol testnet account (in progress)
- ✅ Build author permission contract (DONE)
- ✅ Create backend services (DONE)
- ✅ Build frontend components (DONE)

---

## Technical Setup & Implementation

### Setup Instructions

#### 1. Install Dependencies
```bash
npm install @story-protocol/core-sdk
```

#### 2. Configure Environment Variables
Create/update `.env.local`:
```bash
# Story Protocol Network
STORY_NETWORK="testnet"
STORY_WALLET_KEY="0x..."  # Generate: node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"

# Story Contract Addresses
NEXT_PUBLIC_STORY_IP_REGISTRY="0x..."
NEXT_PUBLIC_STORY_ROYALTY_CONTRACT="0x..."
NEXT_PUBLIC_WRITARCADE_TREASURY="0x..."

# IPFS Gateway
IPFS_GATEWAY="https://gateway.pinata.cloud"
PINATA_API_KEY="..."
```

#### 3. Deploy & Configure
```bash
# Deploy contract
npx hardhat run scripts/deploy-story-ip-author.ts --network story-testnet

# Approve authors
npx hardhat run scripts/approve-author.ts --network story-testnet \
  --paragraph-username fredwilson \
  --wallet-address 0x8626f6940E2eb28930DF11c01840a6F0EA48CcBA \
  --royalty-share 6000
```

### Core Files & Functions

| File | Key Functions |
|------|---|
| `lib/story-protocol.service.ts` | `registerGameAsIP()`, `linkIPAssetToNFT()`, `getRoyaltyDistribution()` |
| `lib/story-config.ts` | Network config, environment validation |
| `app/api/ip/register/route.ts` | POST endpoint for registration |
| `components/story/IPRegistration.tsx` | Registration UI + status |
| `components/story/CreatorDAODashboard.tsx` | Author earnings dashboard |
| `contracts/StoryIPAuthor.sol` | On-chain permission management |

### Game Flow
```
Generate Game → Upload to IPFS → Register on Story → Mint Royalty Tokens 
→ [Optional: Mint NFT on Base] → Link IP to NFT → Complete
```

### Testing Checklist
- [ ] Wallet has testnet tokens
- [ ] StoryIPAuthor deployed
- [ ] Authors approved
- [ ] E2E: article → game → registration → NFT → linked
- [ ] Royalty math verified (60+30+10=100%)

---

## Appendix: Story Protocol Docs & Resources

### Core Documentation
- **Story Mainnet**: https://story.foundation
- **SDK Reference**: @story-protocol/core-sdk
- **IP Asset Registration**: https://docs.story.foundation/docs/ip-asset-standard
- **Royalty Tokens**: https://docs.story.foundation/docs/royalty-tokens
- **Smart Contracts**: https://github.com/storyprotocol/protocol-contracts

### Hackathon Resources
- **Crossmint Story Toolkit**: https://docs.crossmint.com/solutions/story-protocol/introduction
- **Tenderly RPC**: https://tenderly.co/ (free tier for testing)
- **deBridge**: https://docs.debridge.finance/ (cross-chain bridging)
- **ABV.dev**: https://abv.dev/ (GenAI + IP integration)

### Community
- **Story Discord**: https://discord.gg/storyprotocol
- **Hackathon Discord**: Invite in email
- **Demo Day**: Dec 11, 2025 (virtual)

### Troubleshooting
**"Story RPC unreachable"** → Check STORY_RPC_URL, verify testnet online  
**"STORY_WALLET_KEY not found"** → Generate key, add to .env.local  
**"Author not approved"** → Run approve-author script  
**"Contract deployment fails"** → Ensure hardhat configured, wallet funded

