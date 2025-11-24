# WritArcade Architecture

## Farcaster-Native Architecture

### Core Design Principles

#### **Single Source of Truth**
- Farcaster owns social identity
- No data duplication
- Always up-to-date profiles

#### **Privacy by Design**
- We don't store PII
- Users control their data via Farcaster
- GDPR-friendly

#### **Simplified Architecture**
```
Before:
Wallet → DB (cache username) → Display

After:
Wallet → Farcaster API → Display
```

### Database Purpose

The database serves these core purposes for WritArcade:

#### **Game Data Storage**
- **Generated Games**: AI-generated game metadata (title, description, prompts)
- **Game Sessions**: Persistent gameplay across visits
- **Chat History**: Full conversation threads for each game
- **Game Assets**: Generated images, music, custom prompts

#### **Content Processing Cache**
- **Processed Articles**: Scraped/processed newsletter content
- **Content Sources**: Newsletter/blog metadata and settings
- **Generation History**: Track which articles generated which games

#### **Onchain Integration Data**
- **Payment Records**: Memecoin transactions for game generation
- **NFT Metadata**: Game minting information
- **Revenue Tracking**: Creator royalty distribution

#### **Session Management**
- **Anonymous Sessions**: Games work without wallet connection
- **Wallet Sessions**: Link sessions to wallet addresses when connected
- **Cross-Device Continuity**: Resume games on different devices

### Database Schema

```prisma
model User {
  id            String  @id
  walletAddress String  @unique

  // ONLY preferences
  preferredModel String  @default("gpt-4o-mini")
  private        Boolean @default(false)

  // Relations
  games Game[]
}

model Game {
  id        String   @id @default(cuid())
  title     String
  articleUrl String
  genre     String   // "horror" | "comedy" | "mystery"
  difficulty String  // "easy" | "hard"
  content   Json     // Full game JSON
  writerCoinId String
  creatorId String   // User who generated it
  createdAt DateTime @default(now())
  
  // Relations
  creator   User @relation(fields: [creatorId], references: [id])
}
```

### Writer Coin Economics

#### **Initial Writer Coins**
- **$AVC** (Fred Wilson's AVC newsletter) — `0x06FC3D5D2369561e28F28F261148576520F5e49D6ea`
- **Writer Coin #2** — TBD
- **Writer Coin #3** — TBD

#### **Revenue Distribution**

**For game generation** (100 tokens):
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

### Smart Contracts (Base)

#### **WriterCoinPayment.sol**
```solidity
contract WriterCoinPayment {
  mapping(address => bool) public allowedWriterCoins;
  
  function payForGameGeneration(
    address writerCoin,
    address user
  ) external;
  
  function payForMinting(
    address writerCoin,
    address user
  ) external;
  
  function whitelistCoin(...) external;
  function updateCoinConfig(...) external;
}
```

#### **GameNFT.sol**
```solidity
contract GameNFT is ERC721URIStorage {
  struct GameMetadata {
    string articleUrl;
    address creator;
    address writerCoin;
    string genre;
    string difficulty;
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

### Farcaster Wallet Integration

#### **Payment Flow**
1. **Initiate Payment** - Backend prepares payment details
2. **Get User Address** - Retrieve from Farcaster context
3. **Encode Transaction** - Build transaction data
4. **Send Transaction** - Farcaster Wallet handles signing
5. **Verify Payment** - Backend confirms on Base network

#### **Core Functions**
```typescript
// lib/farcasterWallet.ts
- sendTransaction() - Send via Farcaster Wallet SDK
- encodePayForGameGeneration() - ABI encoding for payments
- encodePayForMinting() - ABI encoding for NFT minting
- getUserWalletAddress() - Get user's address
- isFarcasterWalletAvailable() - Check availability
```

### Tech Stack

#### **Frontend Stack**
- **Mini App Framework**: `@farcaster/miniapp-sdk`
- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Wallet**: Farcaster Wallet SDK

#### **Backend Stack**
- **API**: Next.js API routes
- **Database**: PostgreSQL with Prisma
- **Game Generation**: Infinity Arcade pipeline
- **AI Services**: OpenAI GPT-4o Mini

#### **Onchain Stack**
- **Blockchain**: Base only
- **Smart Contracts**: WriterCoinPayment.sol, GameNFT.sol
- **Wallet Interaction**: Farcaster Wallet built-in

### Writer Coin Configuration

```typescript
// lib/writerCoins.ts
const WRITER_COINS = [
  {
    id: "avc",
    name: "AVC",
    symbol: "$AVC",
    address: "0x06FC3D5D2369561e28F261148576520F5e49D6ea",
    writer: "Fred Wilson",
    paragraphAuthor: "fredwilson",
    gameGenerationCost: 100n,  // 100 tokens
    mintCost: 50n,             // 50 tokens
    decimals: 18
  }
]
```

### Game Flow Architecture

```
WritArcade Mini App Flow:
┌─────────────────────────────────┐
│ User opens WritArcade in        │
│ Farcaster Mini App              │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Step 1: Select Writer Coin      │
│ - AVC, Coin #2, Coin #3         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Step 2: Input Article URL       │
│ - Validate Paragraph URL        │
│ - Fetch & preview content       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Step 3: Customize Game          │
│ - Genre (Horror/Comedy/Mystery) │
│ - Difficulty (Easy/Hard)        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Step 4: Generate & Play         │
│ - Pay in writer coin (100)      │
│ - Generate via AI               │
│ - Play in-app                   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Step 5: Mint as NFT (Optional)  │
│ - Pay in writer coin (50)       │
│ - Mint on Base                  │
│ - Share on Farcaster            │
└─────────────────────────────────┘
```

### Deployment Checklist

#### **Smart Contract Deployment**
- [ ] Deploy `WriterCoinPayment.sol` to Base mainnet
- [ ] Deploy `GameNFT.sol` to Base mainnet
- [ ] Verify contracts on Basescan
- [ ] Save addresses to `.env.local`

#### **Configuration**
- [ ] Whitelist AVC Writer Coin with proper revenue split
- [ ] Update environment variables
- [ ] Test payment flow with small amounts
- [ ] Set up monitoring

#### **Environment Variables**
```bash
BASE_RPC_URL="https://mainnet.base.org"
NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS="0x..."
NEXT_PUBLIC_GAME_NFT_ADDRESS="0x..."
NEXT_PUBLIC_NEYNAR_API_KEY="your-key"
NEYNAR_API_KEY="your-key"
```

### Benefits

1. **For Users**
   - One profile to manage (Farcaster)
   - Instant updates across all apps
   - Full control over identity

2. **For Us**
   - Less data to manage
   - No sync issues
   - Better privacy compliance
   - Simpler codebase

3. **For the Ecosystem**
   - Interoperable identity
   - Network effects
   - Farcaster-native from day one