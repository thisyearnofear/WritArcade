# writersarcade - Story Protocol Hackathon 2025

**Event**: Surreal World Assets Hackathon
**Host**: Story Protocol (L1 blockchain for IP)
**Duration**: 4 weeks (Nov 14, 2025 - Dec 12, 2025)
**Prize Pool**: $35,000 USD across 7 main tracks + bonus challenges

## Overview

writersarcade participated in the Story Protocol hackathon to integrate IP licensing capabilities into our platform. Our goal was to enable creators to register their AI-generated games as IP assets on Story Protocol, creating a sustainable ecosystem for ongoing royalties and derivative works.

## Core Idea: The AI Director
Unlike legacy interactive fiction tools (e.g., Twine) where creators must manually write every static branch, writersarcade empowers creators to act as **AI Directors**.

*   **Beyond "Choose Your Own Adventure"**: We don't build "Fixed Trees". We built a "Dynamic Director Engine".
*   **The Creator as Curator**: "Papa" (the creator) doesn't write scripts. He defines the **Constraints**, **Context**, and **Aesthetic**. He sets the stage, casts the actors, and locks the "Vibe" (e.g., "1920s Noir," "Ghibli Whimsy").
*   **Generative Consistency**: The AI acts as an improv actor that strictly adheres to the Creator's directorial notes. This guarantees a high-quality experience that feels "authored" rather than random, while remaining infinite in replayability.
*   **Play-to-Pay Value**: Players pay a fee not to read a static text, but for the **agency** to collapse the wave function of the Creator's world into a unique story artifact (which they then own as an NFT).

## Implementation Status

### ✅ Foundation Built (Nov 26, 2025)

**SDK & Dependencies**:
- ✅ Updated package.json with `@story-protocol/core-sdk@^1.4.2`
- ✅ All dependencies resolved and installed
- ✅ TypeScript compilation passing

**Backend Services**:
- ✅ `lib/story-protocol.service.ts` - IP registration implementation
- ✅ Type definitions and function signatures for all core operations
- ✅ Environment configuration framework
- ✅ `app/api/ip/register/route.ts` - Backend endpoint for IP registration
- ✅ Real SDK integration with proper error handling

**Documentation**:
- ✅ Comprehensive setup guide with implementation roadmap
- ✅ TypeScript examples and SDK patterns
- ✅ Network configuration and environment setup

### ✅ Sprint 5 Implementation Complete (Dec 1, 2025)

**Core Features**:
- ✅ StoryClient initialization with wallet
- ✅ IPFS metadata upload via Pinata (with fallback to mock)
- ✅ Metadata hashing for integrity verification
- ✅ Real SDK call to `registerIpAsset()` 
### ✅ Phase 6: The "Surreal World" Workshop (Dec 11, 2025)

**New Core Features**:
- ✅ **Asset Workshop UI**: Full WYSIWYG editor for game assets.
- ✅ **Decomposition Engine**: Breaking articles into Characters, Mechanics, Visuals.
- ✅ **One-Click Minting**: "Mint IP" button directly in the toolbar.
- ✅ **Marketplace Sidebar**: Drag-and-drop injection of community assets (Vitalik's Shield, etc.).
- ✅ **Composability Engine**: Games track "Parent Assets" via `registerGameAsIP`.

**Tech Stack**:
- **Frontend**: Framer Motion, React Sidebar, Local State Management.
- **Backend**: `GameDatabaseService` (Drafts), `/api/assets/register` (Minting).
- **Protocol**: Story Protocol Gateway (SPG) for fast, code-free minting.

**Testing**:
- ✅ Integration testing with Story testnet
- ✅ Mock mode for development without tokens
- ✅ Error handling and logging
- ✅ Verification on Story Protocol explorer

### ✅ Story Protocol SDK Completion (Dec 11, 2025)

**Full SDK Integration Implemented** (lib/story-protocol.service.ts):
- ✅ PIL (Programmable IP License) terms via `PILFlavor.commercialRemix()`
- ✅ License terms attachment: `client.license.attachLicenseTerms()`
- ✅ License token minting for derivative creators
- ✅ Derivative IP registration with parent linking
- ✅ Royalty claiming: `client.royalty.claimAllRevenue()`
- ✅ Asset composability: Games track parent assets on-chain

**Status**: All 7 core functions production-ready with real SDK calls, dev mode fallbacks, and comprehensive error handling.

### ✅ Client-Side IP Registration (Dec 12, 2025)

**True User Ownership via Wallet Signing:**
- ✅ Removed server-side platform key registration
- ✅ User signs transactions with their own wallet
- ✅ Chain switching UX (Base → Story Aeneid → Base)
- ✅ Enhanced IPRegistration component with visual royalty breakdown
- ✅ Prominent ownership messaging ("Your Signature = Your Ownership")
- ✅ IP registration is optional (can mint NFT on Base without IP)

**Architecture Change**: All Story Protocol registration now happens client-side. Users switch to Story Aeneid testnet (Chain ID 1315), sign the transaction, and become the on-chain IP owner. No server keys required.

### ✅ Smart Contracts Deployed to Base Mainnet (Dec 11, 2025)

**Contracts Deployed & Verified**:
- ✅ **GameNFT** - ERC-721 for game NFT minting
  - Address: `0x778C87dAA2b284982765688AE22832AADae7dccC`
  - Verified on Sourcify: https://repo.sourcify.dev/8453/0x778C87dAA2b284982765688AE22832AADae7dccC
  
- ✅ **WriterCoinPayment** - Payment processor & revenue distribution
  - Address: `0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75`
  - Verified on Sourcify: https://repo.sourcify.dev/8453/0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75

**Features**:
- Dynamic revenue splits (configurable per coin)
- Multi-coin support ($AVC and future tokens)
- Reentrancy guards & access control
- On-chain game metadata storage (creator, article URL, genre, difficulty)

## Technical Implementation

### Architecture

```
WritArcade Platform
│
├─ Asset Creation Pipeline
│  ├─ Article parsing
│  ├─ Semantic analysis
│  ├─ Asset generation
│  └─ Metadata preparation
│
├─ Story Protocol Integration
│  ├─ IP registration service
│  ├─ License terms management
│  ├─ Derivative tracking
│  └─ Royalty distribution
│
└─ API Layer
   ├─ /api/assets/[id]/register (POST/GET)
   ├─ IPFS metadata upload
   └─ Registration status tracking
```

### Key SDK Integrations

#### 1. Client Initialization (User Wallet)
```typescript
import { StoryClient } from "@story-protocol/core-sdk";
import { http } from "viem";
import type { WalletClient } from "viem";

// Called from React component with user's connected wallet
export function createStoryClientFromWallet(walletClient: WalletClient) {
  // Verify user is on Story network (Chain ID 1315)
  if (walletClient.chain?.id !== 1315) {
    console.warn("Switch to Story Aeneid network");
    return null;
  }
  
  // User's wallet signs all transactions
  const client = StoryClient.newClient({
    account: walletClient.account,
    transport: http("https://aeneid.storyrpc.io"),
  });
  
  return client;
}
```

#### 2. IP Asset Registration
```typescript
const response = await client.ipAsset.registerIpAsset({
  nft: {
    type: "mint",
    spgNftContract: "0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc",
  },
  licenseTermsData: [
    {
      terms: PILFlavor.commercialRemix({
        commercialRevShare: 10,
        defaultMintingFee: parseEther("1"),
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
```

## API Endpoints

### Register Asset as IP
```bash
# 1. Create an asset first
curl -X POST http://localhost:3000/api/assets/generate \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Asset"}'

# 2. Register asset on Story (replace ASSET_ID)
curl -X POST http://localhost:3000/api/assets/{ASSET_ID}/register \
  -H "Content-Type: application/json" \
  -d '{"creatorWallet":"0x..."}'

# 3. Check registration status
curl http://localhost:3000/api/assets/{ASSET_ID}/register
```

### Expected Response
```json
{
  "success": true,
  "message": "Asset registered on Story Protocol",
  "registration": {
    "id": "...",
    "assetId": "...",
    "storyIpId": "0x...",
    "transactionHash": "0x...",
    "blockNumber": 12345678,
    "metadataUri": "ipfs://Qm...",
    "status": "registered"
  },
  "ip": {
    "ipId": "0x...",
    "transactionHash": "0x...",
    "registeredAt": "2025-12-01T..."
  }
}
```

## Development Workflow

### Quick Start Guide

1. **Get Testnet Funds**
   - Visit https://faucet.story.foundation/
   - Request testnet $IP tokens

2. **Set Environment Variables**
   ```env
   STORY_RPC_URL="https://aeneid.storyrpc.io"
   STORY_WALLET_KEY="0x..." # Your private key
   PINATA_JWT="pina_..."    # Optional for real IPFS
   ```

3. **Test Asset Registration**
   - Use the API endpoints above
   - Verify on Story Protocol explorer

## What's Working

- ✅ StoryClient initialization with wallet
- ✅ IPFS metadata upload via Pinata
- ✅ Metadata hashing for integrity verification
- ✅ Real SDK call to `registerIpAsset()` 
- ✅ License terms configuration
- ✅ Database persistence of Story IPs
- ✅ API endpoints fully integrated
- ✅ Error handling and logging

## Current Status (March 2026)

### ✅ Completed since hackathon
- ✅ Royalty claim UI in Creator Dashboard
- ✅ Asset IP dashboard in Creator Dashboard
- ✅ `registerPILTerms` wired to real wallet signing via `LicenseConfigurator`
- ✅ `mintAndRegisterIp` + `attachLicenseTerms` fully integrated (no stubs)
- ✅ Live at https://writersarcade.vercel.app/

### Longer Term
- [ ] Story Protocol mainnet deployment (currently Aeneid testnet — Story Protocol is not yet on Base mainnet)
- [ ] Multi-asset derivative games
- [ ] Royalty payment automation

## Key Resources

- **Story Protocol Docs**: https://docs.story.foundation/
- **SDK Reference**: https://docs.story.foundation/sdk-reference/overview
- **Testnet Faucet**: https://faucet.story.foundation/
- **Explorer**: https://aeneid-testnet-explorer.story.foundation/

## Development Notes

All Story Protocol code compiles cleanly and is ready for production:

```bash
npm run type-check  # ✅ No TypeScript errors
npm run build       # Ready
```
