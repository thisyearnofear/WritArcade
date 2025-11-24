# WritArcade - Next Steps (MVP: 5 Weeks)

## 🎯 **Current Status**

Building a Farcaster Mini App to give **Paragraph writer coins** real utility.

**MVP Goal**: Farcaster users select a writer coin (AVC, etc.), paste article URLs, spend that coin, generate games, mint NFTs.

**Launch Partners**: 
- AVC by Fred Wilson ($AVC)
- Writer Coin #2 (TBD)
- Writer Coin #3 (TBD)

---

## ✅ **What We Have**

- Game generation pipeline (Infinity Arcade)
- Next.js 16 + Prisma setup
- Wallet authentication (RainbowKit)
- TypeScript + TailwindCSS

---

## 🚀 **Week 1: Mini App SDK Setup**

### Tasks
- [ ] Install `@farcaster/mini-app` SDK
- [ ] Initialize Mini App project structure
- [ ] Set up Farcaster Wallet authentication
- [ ] Create basic UI layout (header + content area)
- [ ] Deploy stub to Vercel and test in Farcaster

### Resources
- Farcaster Mini Apps docs: https://miniapps.farcaster.xyz
- Example apps: https://github.com/farcasterxyz/miniapps/tree/main/examples

---

## 📄 **Week 2: Article Input & Writer Coin Selection**

### Tasks
- [ ] Create writer coin selector dropdown (AVC, Coin #2, Coin #3)
- [ ] Create URL input component
- [ ] Validate Paragraph article URL + author matches writer coin
- [ ] Fetch article content (simple HTTP GET or Paragraph API)
- [ ] Extract title + body
- [ ] Display article preview
- [ ] Handle errors (invalid URL, author mismatch, fetch failed, etc)

### Paragraph API
```
GET https://paragraph.com/@{username}/{slug}.json
```
Returns JSON with `title`, `content`, and `author` fields.

### Writer Coin Whitelist
Each writer coin has an associated Paragraph author:
- $AVC (0x06FC3D5D2369561e28F261148576520F5e49D6ea) → Fred Wilson
- Coin #2 (TBD) → Author TBD
- Coin #3 (TBD) → Author TBD

---

## 🎮 **Week 3: Game Generation & Customization**

### Tasks
- [ ] Add genre selector (Horror / Comedy / Mystery)
- [ ] Add difficulty selector (Easy / Hard)
- [ ] "Generate Game" button
- [ ] Call existing game generation service
- [ ] Stream response back to user
- [ ] Render playable game in-app
- [ ] Retry/error handling

### Expected Output
User can generate 6 combinations (3 genres × 2 difficulties) and play each one.

---

## 💰 **Week 4: Writer Coin Payments**

### Smart Contracts (Week 4a)
- [ ] Write WriterCoinPayment.sol (multi-token support)
  ```solidity
  contract WriterCoinPayment {
    mapping(address => bool) public allowedWriterCoins;
    
    function generateGame(
      address writerCoin,
      uint256 amount,
      address user
    ) external {
      // 1. Verify writer coin is whitelisted
      // 2. Transfer amount from user
      // 3. Split: writer (60%), platform (20%), creator pool (20%)
      // 4. Emit GameGenerated event
    }
  }
  ```

- [ ] Write GameNFT.sol (standard ERC-721)
- [ ] Deploy to Base Sepolia testnet
- [ ] Test with each writer coin on testnet

### Payment Integration (Week 4b)
- [ ] Add "Pay with [Writer Coin]" button in UI
- [ ] Trigger Farcaster Wallet approval flow
- [ ] Verify writer coin is whitelisted before payment
- [ ] Check user has sufficient balance
- [ ] Verify payment on-chain before generating game
- [ ] Handle failed/rejected payments
- [ ] Display success message + tx hash

### Writer Coins
- **$AVC**: `0x06FC3D5D2369561e28F261148576520F5e49D6ea` (Base)
- **Coin #2**: TBD
- **Coin #3**: TBD
- All use standard ERC-20 (18 decimals)

---

## 🎁 **Week 5: NFT Minting & Launch**

### NFT Minting (Week 5a)
- [ ] Post-game: "Mint as NFT" button
- [ ] Generate metadata (title, description, image)
- [ ] Call GameNFT.mintGame() contract
- [ ] Show transaction status
- [ ] Display minted NFT link

### Launch (Week 5b)
- [ ] Deploy contracts to Base mainnet
- [ ] Deploy Mini App to Farcaster
- [ ] Create demo game + screenshot
- [ ] Post in Farcaster Mini Apps dev group
- [ ] Gather user feedback

---

## 📊 **MVP Success Criteria**

- [ ] 10+ early users complete end-to-end flow
- [ ] Users can generate game in <30 seconds
- [ ] Transaction confirmed on BaseScan
- [ ] At least 1 game minted as NFT
- [ ] Mini App remains <500KB bundle size

---

## 🔄 **Phase 2 (After MVP Validation)**

Only proceed if MVP reaches 50+ users organically:

- Add more tokens ($HIGHER, etc)
- More customization options (art style, tone)
- Leaderboard of top creators
- Share game links via Farcaster casts
- Creator analytics

---

## 📝 **Key Files to Create/Modify**

```
WritArcade/
├── app/
│   └── mini-app/
│       ├── page.tsx              (Main Mini App UI)
│       ├── api/
│       │   ├── articles/route.ts (Paragraph fetch)
│       │   ├── generate/route.ts (Game generation)
│       │   └── mint/route.ts     (NFT minting)
│       └── components/
│           ├── ArticleInput.tsx
│           ├── GameCustomizer.tsx
│           ├── PaymentButton.tsx
│           └── MintButton.tsx
├── contracts/
│   ├── GamePayment.sol
│   └── GameNFT.sol
└── lib/
    ├── paragraph.ts (Article fetching)
    └── contracts.ts (Web3 interaction)
```

---

## 🛠️ **Tech Stack (MVP)**

- **Frontend**: Next.js 16 + @farcaster/mini-app SDK
- **Smart Contracts**: Solidity (Base)
- **Token Interaction**: Viem + Farcaster Wallet
- **Database**: PostgreSQL (existing)
- **Deployment**: Vercel

---

## ⏰ **Timeline**

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Mini App SDK + Farcaster Wallet | App loads in Farcaster |
| 2 | Article fetching | Users can paste URLs |
| 3 | Game generation | Users can generate + play |
| 4 | DEGEN payments | Payment flow works end-to-end |
| 5 | NFT minting + launch | Live on Farcaster + BaseScan |

---

## 📋 **Configuration: Writer Coins & Whitelist**

Before Week 1 starts, finalize:

```typescript
// lib/writerCoins.ts
export const WRITER_COINS = [
  {
    id: "avc",
    name: "AVC",
    symbol: "$AVC",
    address: "0x06FC3D5D2369561e28F261148576520F5e49D6ea",
    writer: "Fred Wilson",
    paragraphAuthor: "fredwilson",  // Validate article author
    paragraphUrl: "https://avc.xyz/",
    gameGenerationCost: 100n,  // 100 tokens
    mintCost: 50n,             // 50 tokens
    decimals: 18
  },
  {
    id: "coin2",
    name: "Coin #2",
    symbol: "$COIN2",
    address: "TBD",
    writer: "TBD",
    paragraphAuthor: "TBD",
    paragraphUrl: "TBD",
    gameGenerationCost: 100n,
    mintCost: 50n,
    decimals: 18
  },
  {
    id: "coin3",
    name: "Coin #3",
    symbol: "$COIN3",
    address: "TBD",
    writer: "TBD",
    paragraphAuthor: "TBD",
    paragraphUrl: "TBD",
    gameGenerationCost: 100n,
    mintCost: 50n,
    decimals: 18
  }
]
```

---

## 🎯 **Immediate Next Action**

1. Confirm Writer Coin #2 and #3 (addresses, authors, URLs)
2. Install Farcaster Mini App SDK
3. Create basic layout with writer coin selector
4. Deploy stub to Vercel
5. Test loading in Farcaster client

**Estimated time**: 1-2 days

---

**Ready to ship!** 🚀
