# Story Protocol + Base: Dual-Chain Architecture & Implementation Guide

**Research Date**: December 1, 2025  
**Status**: Ready for SDK Integration  
**Current Build**: 90% - Framework Complete, SDK Calls Pending

---

## Executive Summary

WritArcade sits at the intersection of **Creator Economics** (Base) and **IP Governance** (Story). This document provides:

1. **Technical Architecture** - How to run both chains simultaneously
2. **SDK Integration Details** - Exact Story SDK v1.4.2 methods needed
3. **Product Design Optimization** - Workflow to minimize friction
4. **Implementation Roadmap** - Prioritized task list with effort estimates

---

## Part 1: System Architecture Overview

### Current State (Base Chain)

WritArcade's existing system handles:
- **Writer Coins** ($AVC, etc.) - ERC-20 tokens on Base
- **GameNFT Contract** - Minting games as NFTs on Base
- **Revenue Distribution** - Immediate payments: 35% writer, 35% creator, 10% platform, 20% burn
- **Wallet**: Farcaster (Base chain native)

**Key Files**:
- `lib/writerCoins.ts` - Writer coin config + Base contracts
- `lib/contracts.ts` - GameNFT contract interaction
- `lib/wallet/browser.ts` - Chain 8453 (Base) hardcoded

**Limitations of Current System**:
- ❌ No IP attribution tracking across derivatives
- ❌ Revenue splits happen once; no ongoing royalties
- ❌ No licensing mechanism for reuse
- ❌ Creator DAOs can't form around IP

---

### Proposed Enhancement (Story Chain)

Story Protocol adds:
- **IP Asset Registry** - Register games as permanent IP assets
- **License Terms** - Set usage permissions (e.g., "allow derivatives, 10% royalty")
- **Royalty Automation** - Revenue flows to parent IP creators forever
- **Derivative Tracking** - Full lineage graph (who used whose work)

**Key Story Concepts**:
- **IP Asset (IPA)**: ERC-721 NFT registered as IP on Story
- **IP Account**: Modified ERC-6551 token-bound account for permissions
- **License Terms**: Programmable IP License (PIL) - defines usage rights
- **License Token**: Minted by derivative creators to use parent IP
- **Royalty Module**: Automatic payment distribution via Story

---

### Dual-Chain Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   WritArcade Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  FRONTEND LAYER                                              │
│  ├─ Game Builder UI                                          │
│  ├─ IP Registration Modal                                   │
│  ├─ Royalty Dashboard                                       │
│  └─ Derivative Discovery                                    │
│                                                               │
│  API LAYER (Next.js Routes)                                 │
│  ├─ /api/games/generate        (WritArcade AI)             │
│  ├─ /api/games/[id]/mint       (Base minting)              │
│  ├─ /api/ip/register           (Story registration)        │
│  ├─ /api/ip/[ipId]/license     (Story licensing)           │
│  └─ /api/royalties/claim       (Story royalties)           │
│                                                               │
│  SERVICE LAYER                                              │
│  ├─ GameService                                             │
│  ├─ AssetService                                            │
│  ├─ BaseContractService ────┬─────────────────┐            │
│  └─ StoryProtocolService ───┤                 │            │
│                              ▼                 ▼            │
└─────────────────────────────────────────────────────────────┘
                                │                 │
                 ┌──────────────┘                 └──────────────┐
                 │                                               │
            BASE CHAIN                                     STORY CHAIN
         (Chain ID: 8453)                           (Chain ID: 1516 testnet)
                 │                                               │
         ┌───────┴──────────┐                           ┌────────┴──────────┐
         │                  │                           │                   │
    GameNFT          WriterCoin              IPAssetRegistry      Licensing
   Contract          Contracts               (ERC-721)           Module
                                                      │
                                             IP Account (ERC-6551)
                                                      │
                                          ┌──────────┬┴────────────┐
                                          │          │             │
                                      License    Royalty      Dispute
                                      Module     Module       Module
```

---

## Part 2: Story Protocol SDK Integration

### SDK Version & Installation

```bash
# Current installation (already in package.json)
npm install @story-protocol/core-sdk@^1.4.2
```

**SDK Capabilities** (v1.4.2 docs):
- ✅ Register IP Assets (mint NFT + register in one call)
- ✅ Attach License Terms (set usage permissions)
- ✅ Mint License Tokens (users buy permission to create derivatives)
- ✅ Register Derivative IP (link child to parent)
- ✅ Claim Royalties (collect automated payments)
- ✅ Access Control (manage permissions via IP Account)

---

### Critical SDK Methods Needed

#### 1. **Initialize Story Client** (Currently Missing)

**Current Code** (`lib/story-protocol.service.ts:38-57`):
```typescript
export function initializeStoryClient() {
  const rpcUrl = process.env.STORY_RPC_URL;
  const privateKey = process.env.STORY_WALLET_KEY;
  
  // ❌ Only validates config, doesn't create client
  return { rpcUrl, hasValidConfig: true };
}
```

**Correct Implementation**:
```typescript
import { StoryClient } from "@story-protocol/core-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { http } from "viem";

export function initializeStoryClient() {
  const rpcUrl = process.env.STORY_RPC_URL || "https://aeneid.storyrpc.io";
  const privateKey = process.env.STORY_WALLET_KEY;
  
  if (!privateKey) {
    throw new Error("STORY_WALLET_KEY environment variable required");
  }
  
  // Clean up key format (remove 0x prefix if present)
  const cleanKey = privateKey.replace(/^0x/, "");
  
  const account = privateKeyToAccount(`0x${cleanKey}`);
  
  const client = StoryClient.newClient({
    account,
    transport: http(rpcUrl),
  });
  
  return client;
}
```

---

#### 2. **Register Game as IP Asset** (Highest Priority)

**Method**: `client.ipAsset.registerIpAsset()`

**Story Documentation Example**:
```typescript
import { PILFlavor, WIP_TOKEN_ADDRESS } from "@story-protocol/core-sdk";
import { parseEther } from "viem";

const response = await client.ipAsset.registerIpAsset({
  nft: {
    type: "mint",
    spgNftContract: "0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc", // Public SPG contract
  },
  licenseTermsData: [
    {
      terms: PILFlavor.commercialRemix({
        commercialRevShare: 5,  // 5% to original creator
        defaultMintingFee: parseEther("1"), // 1 $IP per license token
        currency: WIP_TOKEN_ADDRESS,
      }),
    },
  ],
  ipMetadata: {
    ipMetadataURI: `https://ipfs.io/ipfs/${ipfsHash}`,
    ipMetadataHash: `0x${hashValue}`,
    nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
    nftMetadataHash: `0x${nftHashValue}`,
  },
});

// Response contains:
// - response.ipId: Unique IP Asset ID on Story
// - response.txHash: Transaction hash
// - response.licenseTermsIds: Array of license term IDs
```

**WritArcade Integration** (Replace TODO in `lib/story-protocol.service.ts:68-108`):

```typescript
export async function registerGameAsIP(
  input: IPRegistrationInput
): Promise<IPRegistrationResult> {
  try {
    const client = initializeStoryClient();
    
    // 1. Upload metadata to IPFS
    const ipfsService = new IPFSMetadataService();
    const gameMetadata = {
      title: input.title,
      description: input.description,
      genre: input.genre,
      difficulty: input.difficulty,
      articleUrl: input.articleUrl,
      creators: [
        {
          address: input.authorWalletAddress,
          name: input.authorParagraphUsername,
          contributionPercent: 60, // Author gets 60%
        },
        {
          address: input.gameCreatorAddress,
          name: "Game Creator",
          contributionPercent: 30, // Creator gets 30%
        },
      ],
    };
    
    const ipIpfsHash = await ipfsService.uploadJSON(gameMetadata);
    const ipHash = createHash("sha256")
      .update(JSON.stringify(gameMetadata))
      .digest("hex");
    
    // 2. Prepare NFT metadata (ERC-721 standard)
    const nftMetadata = {
      name: `${input.title} - Story IP`,
      description: input.description,
      image: input.gameMetadataUri,
    };
    
    const nftIpfsHash = await ipfsService.uploadJSON(nftMetadata);
    const nftHash = createHash("sha256")
      .update(JSON.stringify(nftMetadata))
      .digest("hex");
    
    // 3. Register as IP Asset on Story
    const response = await client.ipAsset.registerIpAsset({
      nft: {
        type: "mint",
        spgNftContract: process.env.NEXT_PUBLIC_STORY_SPG_CONTRACT!,
      },
      licenseTermsData: [
        {
          terms: PILFlavor.commercialRemix({
            commercialRevShare: 5, // 5% to original creator
            defaultMintingFee: parseEther("1"),
            currency: WIP_TOKEN_ADDRESS,
          }),
        },
      ],
      ipMetadata: {
        ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
        ipMetadataHash: `0x${ipHash}`,
        nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
        nftMetadataHash: `0x${nftHash}`,
      },
    });
    
    return {
      storyIPAssetId: response.ipId,
      ipId: response.ipId,
      txHash: response.txHash,
      registeredAt: Math.floor(Date.now() / 1000),
      licenseTermsIds: response.licenseTermsIds || [],
    };
  } catch (error) {
    throw new Error(
      `IP registration failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
```

---

#### 3. **Register Derivative Game** (For When Games Use Parent IPs)

**Method**: `client.ipAsset.registerIpAndMakeDerivative()`

**When Used**: A user creates a game that remixes an existing IP asset.

```typescript
export async function registerDerivativeIP(
  parentIpId: string,
  licenseTokenId: number | bigint,
  derivativeTitle: string,
  derivativeDescription: string
): Promise<IPRegistrationResult> {
  try {
    const client = initializeStoryClient();
    
    // Upload derivative metadata
    const ipfsService = new IPFSMetadataService();
    const metadata = {
      title: derivativeTitle,
      description: derivativeDescription,
      derivedFrom: [parentIpId],
    };
    
    const ipfsHash = await ipfsService.uploadJSON(metadata);
    const metadataHash = createHash("sha256")
      .update(JSON.stringify(metadata))
      .digest("hex");
    
    // Register derivative on Story
    const response = await client.ipAsset.registerIpAndMakeDerivative({
      nft: {
        type: "mint",
        spgNftContract: process.env.NEXT_PUBLIC_STORY_SPG_CONTRACT!,
      },
      derivData: {
        parentIpIds: [parentIpId],
        licenseTermsIds: [licenseTokenId],
      },
      ipMetadata: {
        ipMetadataURI: `https://ipfs.io/ipfs/${ipfsHash}`,
        ipMetadataHash: `0x${metadataHash}`,
        nftMetadataURI: `https://ipfs.io/ipfs/${ipfsHash}`, // Reuse
        nftMetadataHash: `0x${metadataHash}`,
      },
    });
    
    return {
      storyIPAssetId: response.ipId,
      ipId: response.ipId,
      txHash: response.txHash,
      registeredAt: Math.floor(Date.now() / 1000),
      licenseTermsIds: [],
    };
  } catch (error) {
    throw new Error(`Derivative registration failed: ${error.message}`);
  }
}
```

---

#### 4. **Mint License Tokens** (Users Pay to Create Derivatives)

**Method**: `client.license.mintLicenseTokens()`

**When Used**: User wants to create a derivative of an IP and needs to "buy" permission.

```typescript
export async function mintLicenseTokens(
  licensorIpId: string,
  licenseTermsId: number | bigint,
  receiver: Address,
  amount: number = 1
): Promise<{ txHash: string; licenseTokenIds: bigint[] }> {
  try {
    const client = initializeStoryClient();
    
    const response = await client.license.mintLicenseTokens({
      licensorIpId,
      licenseTermsId,
      receiver,
      amount,
      maxMintingFee: parseEther("10"), // Max 10 $IP willing to pay
      maxRevenueShare: 100, // Accept up to 100% (usually 5-10%)
    });
    
    return {
      txHash: response.txHash,
      licenseTokenIds: response.licenseTokenIds || [],
    };
  } catch (error) {
    throw new Error(`License minting failed: ${error.message}`);
  }
}
```

---

#### 5. **Claim Royalties** (Collect Revenue from Derivatives)

**Method**: `client.royalty.claimAllRevenue()`

**When Used**: Original IP creator collects payments from all derivative games.

```typescript
export async function claimRoyalties(
  ancestorIpId: string,
  claimer: Address,
  childIpIds: string[],
  royaltyPolicies: Address[]
): Promise<{ txHash: string; claimedAt: number }> {
  try {
    const client = initializeStoryClient();
    
    const response = await client.royalty.claimAllRevenue({
      ancestorIpId,
      claimer,
      childIpIds,
      royaltyPolicies,
      currencyTokens: [WIP_TOKEN_ADDRESS], // Claim in $IP
    });
    
    return {
      txHash: response.txHash,
      claimedAt: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    throw new Error(`Royalty claim failed: ${error.message}`);
  }
}
```

---

## Part 3: Product Design Optimization

### User Journey: From Game Creation to IP Registration

**Current Flow** (Base Only):
```
1. Write article (Paragraph)
2. Select writer coin
3. Generate game (AI)
4. Pay fee → Game generated ✅
5. Mint NFT on Base (optional)
6. ❌ DEAD END - No royalties if someone remixes
```

**Optimized Flow** (Base + Story):
```
1. Write article (Paragraph)
   ↓
2. Select writer coin → Generate game on Base (instant payment)
   ↓
3. [NEW] Register as IP on Story (1-2 min)
   ├─ Set royalty % (5-10% default)
   ├─ Enable derivatives
   ├─ IPFS upload + Story tx
   ↓
4. [NEW] Get Story IP Asset ID → Display in game details
   ↓
5. Mint NFT on Base (optional)
   ├─ Links to Story IP ID in metadata
   ├─ Creates bridge between chains
   ↓
6. [NEW] Derivative Game Path:
   ├─ User discovers IP in market
   ├─ Mints license token (pay in $IP)
   ├─ Creates derivative game
   ├─ Registers derivative on Story
   ├─ Original creator earns royalties automatically
```

---

### UI/UX Considerations

#### 1. **Reduce Registration Friction**

**Problem**: Story registration is async, user expects instant response.

**Solution**:
```typescript
// Auto-register on mint (if game has revenue)
async function mintGameNFT(gameId: string, uri: string) {
  // Step 1: Mint on Base (instant)
  const baseResult = await mintOnBase(gameId, uri);
  
  // Step 2: Register on Story (background, non-blocking)
  registerOnStory(gameId).catch(err => 
    logError(`Story registration failed for ${gameId}: ${err}`)
  );
  
  return baseResult;
}
```

**UI Feedback**:
- "NFT Minted on Base ✅"
- "IP Registration pending... (will complete in 1-2 min)"
- Notify when Story registration completes

#### 2. **Show Attribution Chain**

**Display**:
```
Game: "Mystery of the Algorithm"
├─ Original IP: "AI Stories" (Story ID: 0x...)
├─ Your Royalty: 10% of all future uses
├─ Parent Creator: @fredwilson
└─ View on Story → [Link to Story Protocol dashboard]
```

#### 3. **Royalty Dashboard**

Integrate with CreatorDAODashboard:
```typescript
interface RoyaltyInfo {
  parentIPCount: number // "This asset is used by 3 derivative games"
  claimableAmount: bigint // "$IP available to claim"
  totalEarned: bigint // "Total royalties earned: 5 $IP"
  lastClaimDate: number
}
```

---

### Cross-Chain Metadata Sync

**Problem**: Game minted on Base, IP registered on Story. They need to know about each other.

**Solution**: Link both in metadata

```json
// Base NFT Metadata
{
  "name": "Mystery Game",
  "description": "...",
  "image": "...",
  "external_url": "https://writarcade.com/games/mystery",
  // NEW: Cross-chain link
  "story_ip_asset_id": "0x1234...",
  "story_ip_link": "https://aeneid.explorer.story.foundation/ipa/0x1234..."
}
```

```json
// Story IP Metadata
{
  "title": "Mystery Game",
  "description": "...",
  "creators": [...],
  // NEW: Cross-chain link
  "base_nft_token_id": 42,
  "base_nft_address": "0x2b44..."
}
```

---

## Part 4: Implementation Priority & Effort

### Phase 1: Foundation (Week 1) - 8 hrs

| Task | Effort | Status |
|------|--------|--------|
| Initialize Story client | 30 min | 🔴 TODO |
| Implement IPFS metadata service | 1.5 hrs | 🟡 Partial |
| registerGameAsIP() full SDK call | 2 hrs | 🔴 TODO |
| Test with Story testnet (Aeneid) | 2 hrs | 🔴 TODO |
| Add .env vars for Story RPC | 15 min | 🟡 Partial |
| Update Prisma schema | 1.5 hrs | 🔴 TODO |

### Phase 2: Licensing (Week 2) - 6 hrs

| Task | Effort | Status |
|------|--------|--------|
| Implement mintLicenseTokens() | 1.5 hrs | 🔴 TODO |
| Implement registerDerivativeIP() | 2 hrs | 🔴 TODO |
| API endpoint: /api/ip/[ipId]/mint-license | 1 hr | 🔴 TODO |
| API endpoint: /api/games/[id]/register-derivative | 1.5 hrs | 🔴 TODO |

### Phase 3: Royalties (Week 3) - 5 hrs

| Task | Effort | Status |
|------|--------|--------|
| Implement claimRoyalties() | 1.5 hrs | 🔴 TODO |
| API endpoint: /api/royalties/claim | 1 hr | 🔴 TODO |
| Update CreatorDAODashboard | 2 hrs | 🔴 TODO |
| Test end-to-end flow | 0.5 hrs | 🔴 TODO |

### Phase 4: UX & Polish (Week 4) - 5 hrs

| Task | Effort | Status |
|------|--------|--------|
| Update IPRegistration component | 1.5 hrs | 🟡 Partial |
| Add cross-chain metadata linking | 1.5 hrs | 🔴 TODO |
| Error handling & retry logic | 1 hr | 🔴 TODO |
| Documentation & code comments | 1 hr | 🔴 TODO |

**Total Effort**: ~24 hours  
**Timeline**: 1 month with part-time work

---

## Part 5: Environment Configuration

### Required Environment Variables

```bash
# Story Protocol
STORY_RPC_URL=https://aeneid.storyrpc.io          # Testnet endpoint
STORY_WALLET_KEY=0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  # 64 hex chars (no 0x prefix preferred)
NEXT_PUBLIC_STORY_SPG_CONTRACT=0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc

# IPFS (for metadata)
PINATA_JWT=eyxxxxx                                  # Pinata API key
IPFS_GATEWAY=https://gateway.pinata.cloud

# Base (existing)
NEXT_PUBLIC_GAME_NFT_ADDRESS=0x2b440Ee81A783E41eec5dEfFB2D1Daa6E35bCC34
NEXT_PUBLIC_GAME_NFT_SEPOLIA=0x...  # If testing on Sepolia
```

### Network Configuration in Code

```typescript
// lib/story-config.ts already covers this
export const STORY_NETWORKS = {
  testnet: {
    name: "Story Protocol Testnet (Aeneid)",
    rpcUrl: "https://aeneid.storyrpc.io",
    chainId: 1516,
    explorer: "https://aeneid.explorer.story.foundation",
  },
  mainnet: {
    name: "Story Protocol Mainnet",
    rpcUrl: "https://mainnet-rpc.story.foundation",
    chainId: 1514,
    explorer: "https://explorer.story.foundation",
  },
};
```

---

## Part 6: Database Schema Updates

### New Prisma Models Needed

```prisma
model StoryIPAsset {
  id              String    @id @default(cuid())
  ipId            String    @unique  // Story Protocol IP Asset ID
  gameId          String    @unique
  game            Game      @relation(fields: [gameId], references: [id])
  
  // Registration data
  txHash          String    @db.VarChar(66)
  blockNumber     Int
  registeredAt    DateTime
  
  // License configuration
  licenseTermsIds String[]  // Array of license term IDs
  royaltyPercent  Int       @default(5)  // % to original creator
  
  // Status tracking
  status          String    @default("pending")  // pending, confirmed, failed
  error           String?   // Error message if failed
  
  // Links
  ipfsMetadataUri String
  storyLink       String    @db.VarChar(255)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model StoryDerivativeLink {
  id              String    @id @default(cuid())
  
  parentIPId      String    // Parent IP on Story
  childGameId     String    // Derivative game ID
  childGame       Game      @relation(fields: [childGameId], references: [id])
  
  // License token purchased
  licenseTokenId  BigInt
  licenseTermsId  Int
  
  // Royalty tracking
  royaltyRate     Int       // Basis points (1000 = 10%)
  totalPaidOut    BigInt    @default(0)  // In $IP wei
  
  registeredAt    DateTime
  createdAt       DateTime  @default(now())
  
  @@unique([parentIPId, childGameId])
}

model IPRoyaltyClaim {
  id              String    @id @default(cuid())
  
  ipId            String
  claimer         String    @db.VarChar(42)  // Wallet address
  
  // Claim details
  amount          BigInt    // $IP claimed
  txHash          String    @db.VarChar(66)
  blockNumber     Int
  
  childIPIds      String[]  // Which derivatives were claimed from
  
  claimedAt       DateTime
  createdAt       DateTime  @default(now())
}
```

### Migration Commands

```bash
# Add models to prisma/schema.prisma, then:
npx prisma migrate dev --name add_story_protocol_models
npx prisma generate
```

---

## Part 7: Testing Checklist

### Testnet Setup

1. **Get Aeneid Testnet $IP**:
   - Faucet: https://www.story.foundation/
   - Need ~0.1 $IP for gas

2. **Deploy SPG Collection** (optional, can use public):
   ```bash
   npx hardhat run scripts/register-nft-collection.ts --network story-testnet
   ```

3. **Test Registration Locally**:
   ```bash
   npm run test:story-register
   ```

### Test Cases

```typescript
describe("Story Protocol Registration", () => {
  test("registerGameAsIP should create IP asset with license terms", async () => {
    const result = await registerGameAsIP({
      title: "Test Game",
      description: "Test Description",
      articleUrl: "https://avc.xyz/test",
      gameCreatorAddress: "0x123...",
      authorParagraphUsername: "testuser",
      authorWalletAddress: "0x456...",
      genre: "mystery",
      difficulty: "easy",
      gameMetadataUri: "ipfs://Qm...",
      nftMetadataUri: "ipfs://Qm...",
    });
    
    expect(result.storyIPAssetId).toMatch(/^0x[a-f0-9]+$/);
    expect(result.txHash).toMatch(/^0x[a-f0-9]+$/);
    expect(result.licenseTermsIds.length).toBeGreaterThan(0);
  });
  
  test("registerDerivativeIP should link to parent IP", async () => {
    // ...
  });
  
  test("mintLicenseTokens should charge minting fee", async () => {
    // ...
  });
  
  test("claimRoyalties should sum all derivatives", async () => {
    // ...
  });
});
```

---

## Part 8: Deployment Checklist

### Before Mainnet Launch

- [ ] Story Protocol client initialization tested
- [ ] All SDK method calls return real transaction hashes
- [ ] Prisma schema deployed
- [ ] Error handling covers network failures
- [ ] Retry logic handles transient failures
- [ ] IPFS metadata uploads are verified
- [ ] Cross-chain linking working in both directions
- [ ] Royalty calculations verified with accountants
- [ ] All tests passing
- [ ] Legal review of PIL terms
- [ ] Waitlist opened for beta testing

### Mainnet vs Testnet

| Component | Testnet (Aeneid) | Mainnet |
|-----------|------------------|---------|
| Chain ID | 1516 | 1514 |
| RPC | aeneid.storyrpc.io | mainnet-rpc.story.foundation |
| Explorer | aeneid.explorer.story.foundation | explorer.story.foundation |
| $IP Faucet | story.foundation | N/A |
| SPG Contract | 0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc | (TBD) |

---

## References & Resources

### Official Story Documentation
- **TypeScript SDK**: https://docs.story.foundation/developers/typescript-sdk/overview
- **Register IP**: https://docs.story.foundation/developers/typescript-sdk/register-ip-asset
- **License Terms**: https://docs.story.foundation/sdk-reference/license
- **Royalty Module**: https://docs.story.foundation/sdk-reference/royalty
- **GitHub SDK**: https://github.com/storyprotocol/sdk
- **Deployed Contracts**: https://docs.story.foundation/developers/deployed-smart-contracts

### WritArcade Current Implementation
- `lib/story-protocol.service.ts` - Service skeleton (ready for SDK)
- `app/api/ip/register/route.ts` - Backend endpoint (ready for integration)
- `components/story/IPRegistration.tsx` - UI (ready to enhance)
- `docs/STORY_PROTOCOL_SETUP.md` - Setup guide
- `docs/STORY_SDK_REFERENCE.md` - SDK method reference

### Key Concepts
- **IP Asset**: ERC-721 NFT registered on Story Protocol
- **IP Account**: ERC-6551 token-bound account for managing permissions
- **License Terms**: Programmable IP License (PIL) - defines usage rights and royalties
- **License Token**: Minted by creators to grant permission for derivatives
- **Royalty Module**: Automated revenue distribution across IP chains

---

## Conclusion

Story Protocol + Base creates a **two-tier IP economy**:

1. **Base** handles fast, low-cost **game creation** and **immediate revenue distribution**
2. **Story** handles **persistent IP ownership**, **licensing**, and **long-tail royalties**

The remaining 10% of work is straightforward SDK integration. All framework, types, and architecture are in place. Implementation should take 3-4 weeks of focused development.

**Next Step**: Begin with Part 4 Phase 1 (Foundation) - initialize Story client and implement `registerGameAsIP()`.
