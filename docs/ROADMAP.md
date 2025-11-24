# WritArcade - Product Roadmap

## 🎯 **Vision**

**Give AVC readers a new way to engage: turn Fred Wilson's articles into playable, mintable games.**

AVC readers can spend their writer coins to generate unique game interpretations of Fred's articles, creating a new economy around content—all natively within Farcaster. MVP launches with AVC only; other writer coins added later.

---

## 💡 **Core Concept**

### **The Flow**
1. **User in Farcaster Mini App**: Opens WritArcade app
2. **Paste AVC Article URL**: User provides Paragraph article link from AVC (https://avc.xyz/)
3. **Fetch Article**: Backend scrapes title + content from Paragraph
4. **Customize Game**: Select genre (Horror/Comedy/Mystery) + difficulty (Easy/Hard)
5. **Pay in $AVC**: User approves 100 $AVC token spending in Farcaster Wallet
6. **AI Generates**: Unique game interpretation created in seconds
7. **Play Immediately**: Interactive game plays in-app
8. **Mint as NFT**: User can mint generated game as Base NFT for 50 $AVC (optional)
9. **Share on Farcaster**: Link to game shareable via Farcaster cast

### **Key Insight**
**Same article → Infinite unique game versions**
- Horror interpretation vs. Comedy interpretation
- Easy mode vs. Hard mode
- Different narrative angles

Each version is a unique creative expression, making games collectible and incentivizing sharing.

---

## 💰 **Writer Coin Economics (MVP)**

### **Initial Writer Coins**

MVP launches with:
- **$AVC** (Fred Wilson's AVC newsletter) — `0x06FC3D5D2369561e28F261148576520F5e49D6ea`
- **Writer Coin #2** — TBD
- **Writer Coin #3** — TBD

Each writer sets their own pricing (100 tokens for game generation recommended).

### **Revenue Distribution**

**For game generation** (Writer sets pricing, e.g., 100 tokens):
```
User pays 100 $AVC (or other writer coin)
├─ 60 Writer Coin → Writer's treasury
├─ 20 Writer Coin → WritArcade Platform
└─ 20 Writer Coin → Creator/Community Pool
```

**For NFT Minting** (50 tokens):
```
User pays 50 $AVC (or other writer coin)
├─ 30 Writer Coin → Game Creator
├─ 15 Writer Coin → Writer's treasury
└─ 5 Writer Coin → WritArcade
```

### **Why This Works**

1. **Immediate Utility**: Writer coins now have real use case
2. **Writer Control**: Each writer controls their token distribution
3. **Community Incentives**: Game creators earn tokens
4. **Content Engagement**: Readers spend tokens on favorite writers
5. **Base Native**: Leverages Farcaster + Paragraph ecosystem

---

## 🎮 **Game Customization Levers (MVP)**

### **Core Parameters** (MVP Only)
- **Genre**: Horror, Comedy, Mystery (user selects 1)
- **Difficulty**: Easy or Hard (user selects 1)

**Future additions** (Phase 2):
- More genres (Action, Romance, Sci-Fi)
- Medium difficulty
- Art style selection
- Tone variations (Serious, Satirical)

### **Example**

**Same Article: "The Future of AI"**

**Version A** (Horror + Hard)
- Dystopian AI takeover survival scenario
- Tense, serious tone
- Complex choices with consequences
- Cost: 100 DEGEN

**Version B** (Comedy + Easy)
- Lighthearted AI robot comedy
- Funny dialogue and absurd situations
- Simple, forgiving gameplay
- Cost: 100 DEGEN

**Result**: 2 completely different games from same article, both sharable as NFTs on Base.

---

## 🏗️ **Technical Architecture (MVP)**

### **Smart Contracts (Base)**

#### **1. GameNFT.sol** (ERC-721)
```solidity
contract GameNFT is ERC721URIStorage {
  struct GameMetadata {
    string articleUrl;      // Paragraph article URL
    address creator;        // User who generated it
    address writerCoin;     // Writer coin address used
    string genre;          // Horror/Comedy/Mystery
    string difficulty;     // Easy/Hard
    uint256 createdAt;
  }
  
  mapping(uint256 => GameMetadata) public games;
  
  function mintGame(
    address to,
    string memory tokenURI,
    GameMetadata memory metadata
  ) external returns (uint256 tokenId);
}
```

#### **2. WriterCoinPayment.sol**
```solidity
contract WriterCoinPayment {
  mapping(address => bool) public allowedWriterCoins;
  
  function generateGame(
    address writerCoin,
    uint256 amount,
    address user
  ) external {
    // 1. Verify writer coin is whitelisted
    // 2. Verify user approved token spending
    // 3. Transfer from user to contract
    // 4. Split tokens: writer (60%), platform (20%), creator pool (20%)
    // 5. Emit GameGenerated event
  }
  
  function mintGame(
    uint256 gameId,
    address writerCoin,
    uint256 amount,
    address user
  ) external {
    // 1. Verify writer coin is whitelisted
    // 2. Verify user approved token spending
    // 3. Transfer from user
    // 4. Split tokens: creator (30%), writer (15%), platform (5%)
    // 5. Call GameNFT.mintGame()
  }
}
```

### **Writer Coin Whitelist**

```typescript
const WRITER_COINS = [
  {
    name: "AVC",
    symbol: "$AVC",
    address: "0x06FC3D5D2369561e28F261148576520F5e49D6ea",
    writer: "Fred Wilson",
    gameGenerationCost: 100,  // 100 $AVC
    mintCost: 50               // 50 $AVC
  },
  // TBD: Writer Coin #2
  // TBD: Writer Coin #3
]
```

### **Backend Flow**

```typescript
// 1. User opens Mini App, selects writer coin, pastes article URL
POST /api/games/generate
{
  writerCoinAddress: "0x06FC3D5D2369561e28F261148576520F5e49D6ea",
  articleUrl: "https://avc.xyz/blog/article",
  genre: "horror",
  difficulty: "hard",
  walletAddress: "0x..."
}

// 2. Backend:
//    a. Fetch article from Paragraph URL
//    b. Verify writer coin is whitelisted
//    c. Check user has sufficient balance
//    d. Wait for on-chain payment via Farcaster Wallet
//    e. Generate game via AI
//    f. Store game metadata + writer coin used
//    g. Return game + play link

// 3. User plays game in Mini App

// 4. User clicks "Mint as NFT"
POST /api/games/mint
{
  gameId: "game-xyz",
  writerCoinAddress: "0x06FC3D5D2369561e28F261148576520F5e49D6ea",
  walletAddress: "0x..."
}

// 5. Backend:
//    a. Wait for on-chain mint payment
//    b. Call GameNFT.mintGame()
//    c. Return NFT metadata
```

### **Writer Coin Selection**
- Users select from whitelisted writer coins at start
- Only articles from that writer's Paragraph can be used
- Smart contract validates writer coin address before payment

---

## 📅 **Implementation Phases (MVP: 4-5 Weeks)**

### **Phase 1: Mini App + Farcaster Integration (Weeks 1-2)**

**Week 1**: Mini App Foundation
- [ ] Set up Farcaster Mini App SDK
- [ ] Farcaster Wallet integration (authentication)
- [ ] Mini App UI shell + navigation
- [ ] Deploy stub to Vercel

**Week 2**: Article Input & Fetching
- [ ] Paragraph article URL input field
- [ ] Fetch/scrape Paragraph article (title + body)
- [ ] Validate URL format
- [ ] Display article preview

**Success Metrics**:
- [ ] Users can paste Paragraph URL and see article content
- [ ] Mini App loads in Farcaster

---

### **Phase 2: Game Generation & Customization (Week 3)**

**Week 3**: Game Generation
- [ ] Genre selector (Horror/Comedy/Mystery)
- [ ] Difficulty selector (Easy/Hard)
- [ ] Call existing game generation service
- [ ] Stream game response back to user
- [ ] Play game in Mini App

**Success Metrics**:
- [ ] Generate game from article in < 30 seconds
- [ ] Game plays fully in-app
- [ ] All 3 genres + 2 difficulties work

---

### **Phase 3: DEGEN Payments (Week 4)**

**Week 4a**: Smart Contracts
- [ ] Deploy GamePayment.sol (Base Sepolia, then mainnet)
- [ ] Deploy GameNFT.sol (Base Sepolia, then mainnet)
- [ ] Test token transfers with Farcaster Wallet

**Week 4b**: Payment Flow
- [ ] Add "Pay with DEGEN" button
- [ ] Trigger Farcaster Wallet approval flow
- [ ] Verify payment on-chain
- [ ] Unlock game generation after payment
- [ ] Handle payment errors gracefully

**Success Metrics**:
- [ ] First game generated with DEGEN payment
- [ ] Transaction visible on BaseScan
- [ ] User owns game record in DB

---

### **Phase 4: NFT Minting + Polish (Week 5)**

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

**Success Metrics**:
- [ ] First game minted as NFT
- [ ] NFT visible on Base block explorers
- [ ] 50+ MVP users
- [ ] Gather feedback for Phase 2

---

### **Phase 2 (Future): Expand & Improve**

- [ ] Add more token support ($HIGHER, etc.)
- [ ] Leaderboard of top creators
- [ ] Share game links via Farcaster casts
- [ ] More customization options (art style, tone)
- [ ] Game remixing/variations
- [ ] Creator analytics dashboard

---

## 🎯 **Go-to-Market Strategy (MVP)**

### **Launch: Farcaster Community (Week 5)**

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

---

### **Phase 2 (Future): Expand Distribution**

Once MVP validates product-market fit:
- Paragraph writer partnerships
- DEGEN holder promotions
- More token support
- Broader Farcaster marketing

---

## 💰 **Revenue Model (MVP)**

### **MVP Revenue Streams**

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

---

## 🎮 **Example User Journey (MVP)**

### **Typical User Flow**
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

---

## 🚀 **Success Metrics (MVP)**

### **Week 5** (MVP Launch)
- [ ] 50+ users in Farcaster
- [ ] 20+ games generated
- [ ] 5+ games minted as NFTs
- [ ] Mini App loads reliably
- [ ] Zero critical bugs

### **Week 8** (Post-MVP)
- [ ] 100+ users
- [ ] 100+ games generated
- [ ] 30+ minted NFTs
- [ ] Users can generate + mint in <5 minutes
- [ ] Positive feedback from Farcaster community

### **Phase 2** (Validation)
- [ ] 500+ users
- [ ] 1,000+ games generated
- [ ] Clear product-market fit signals
- [ ] Data for product roadmap decisions

---

## 🎯 **Competitive Advantages**

1. **Farcaster-Native**: Built inside Farcaster Mini Apps, launches with Paragraph integration
2. **First Real Use Case**: Gives Paragraph writer coins immediate, tangible utility
3. **Infinite Variety**: Same article → infinite game interpretations
4. **Fast to Play**: Generate + play game in <2 minutes
5. **Collectible**: Games are minted as Base NFTs, shareable
6. **Creator-Centric**: Writers control their own token distribution
7. **Community Engagement**: Readers spend writer coins on favorite content

---

## 🔮 **Future Vision (Phase 2+)**

Once MVP validates product-market fit:

### **Phase 2**: Expansion
- More tokens (HIGHER, others)
- More customization (art style, tone, length)
- Leaderboards + creator recognition
- Share to cast (game links go viral)
- Creator analytics

### **Phase 3**: Ecosystem
- Newsletter/blog partnerships
- Game marketplace/discovery
- Cross-chain support (Optimism, Arbitrum)
- Creator incubator program
- Advanced AI models

### **Phase 4**: Protocol
- Open gaming protocol
- Third-party builders
- DAO governance
- Token for creators
- Global creator economy

---

**WritArcade: Turn any article into a playable game, instantly.** 🎮

