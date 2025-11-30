# Story Protocol Integration Plan

**Updated:** November 27, 2025  
**SDK Version:** @story-protocol/core-sdk@^1.4.2
**Status:** Refined Scope - Asset-Only Integration (Phase 6+)

## Summary

Story Protocol integration is **scoped to the Asset Marketplace feature** (Phase 6), **not the existing game flow**. This separation provides maximum flexibility while keeping the proven Base payment infrastructure untouched.

### Why Assets, Not Games?
- **Games are ephemeral**: AI-generated fresh each time, remade from same articles daily
- **Assets are persistent**: Reusable components (characters, mechanics, story beats) with long-term value
- **Story fits assets**: IP registration + licensing + derivative tracking is perfect for asset collaboration
- **Games stay on Base**: Payment infrastructure already works, proven in production
- **Zero risk**: Asset feature is independent; if it flops, current business unaffected

### What's Done ✅

1. **Fixed Dependency Issue**
   - Original version `0.8.0` did not exist on npm
   - Updated to stable `1.4.2` (latest)
   - All dependencies resolve and install correctly

2. **Service Architecture** (`lib/story-protocol.service.ts`)
   - ✅ Type-safe interfaces for all operations
   - ✅ Function signatures for 6 core operations
   - ✅ Environment configuration framework
   - ✅ Error handling patterns
   - ✅ TypeScript compilation passing

3. **API Route** (`app/api/ip/register/route.ts`)
   - ✅ Request validation
   - ✅ Response formatting
   - ✅ Error handling with specific cases
   - ✅ Database integration points
   - ✅ Ready for placeholder → SDK implementation transition

4. **Documentation** (`docs/STORY_PROTOCOL_SETUP.md`)
   - ✅ Complete setup guide (400+ lines)
   - ✅ Environment variable documentation
   - ✅ API reference with examples
   - ✅ Network info (Aeneid testnet & Mainnet)
   - ✅ Contract addresses for both networks
   - ✅ Implementation roadmap with 7 TODO items
   - ✅ Resource links to official docs

5. **Build Status**
   - ✅ `lib/story-protocol.service.ts` compiles cleanly
   - ✅ No TypeScript errors in service code
   - ✅ Path aliases and imports configured

## Current Implementation State

### Service Functions (Skeleton Ready)

```typescript
// All of these are ready for SDK integration:
- registerGameAsIP()        // Register game as IP Asset
- getIPAssetDetails()       // Fetch IP metadata
- attachLicenseTermsToIP()  // Attach license options
- mintLicenseTokens()       // Create license tokens
- registerDerivativeIP()    // Register child IP Asset
- claimRoyalties()          // Claim revenue from derivatives
- getClaimableRevenue()     // Check claimable amount
```

Each function has:
- ✅ Proper TypeScript types
- ✅ Complete JSDoc comments
- ✅ Error handling framework
- ✅ Environment validation
- ✅ Placeholder implementation (returns mock data)

## Integration Scope (Asset Marketplace Feature)

Story Protocol is **only used for Asset IP registration and licensing**, not for game transactions.

### Asset Registration Flow
```
Article 
  ↓
Generate Asset Pack (characters, mechanics, story beats)
  ↓
Register as IP Asset on Story Protocol
  ↓
Attach License Terms (PIL: "Use my assets, pay me X% of game revenue")
  ↓
Asset lives in Marketplace with licensing info
  ↓
Other Users build games from assets
  ↓
Games registered as Derivatives of asset IPs
  ↓
Revenue from Base game → flows to Story royalty vault
  ↓
Asset creators claim royalties on Story
```

### Implementation Timeline (Phase 6)

**Sprint 1: Asset Generation & Data Models**
- Create `domains/assets/asset-generation.service.ts` (AI asset decomposition)
- Add Prisma models: `Asset`, `GameFromAsset`, `AssetRevenue`
- Create asset database service (CRUD)
- **No Story Protocol yet—just local testing**

**Sprint 2: Asset Marketplace UI**
- Build `/app/assets/` pages (discover, browse, detail view)
- Asset creation flow (upload article → generate assets)
- Asset preview/management dashboard

**Sprint 3: Game Builder from Assets**
- "Build game from assets" UI (select + customize)
- Compose multiple asset packs into single game
- Game registration flow

**Sprint 4: Story Protocol Integration**
- Asset registration on Aeneid testnet
- License terms attachment (PIL v2)
- Derivative game registration
- Royalty tracking
- **Full SDK implementation in this sprint**

### What Changes to Story Protocol Code

**Before (Current State):**
```
lib/story-protocol.service.ts → Targets game registration (not used)
app/api/ip/register/route.ts   → Targets games (not used)
```

**After (Phase 6+):**
```
lib/story-protocol.service.ts → Refactored for asset registration
  ├─ registerAssetAsIP()        (replaces registerGameAsIP)
  ├─ getAssetIPDetails()        (replaces getIPAssetDetails)
  ├─ attachLicenseToAsset()     (replaces attachLicenseTermsToIP)
  └─ ... (other functions refactored similarly)

domains/assets/story-protocol.service.ts → New asset-specific service
  ├─ Asset IP registration
  ├─ License minting
  ├─ Derivative game registration
  └─ Royalty claim handling

app/api/assets/register/route.ts → New endpoint (replaces /ip/register)
  └─ Registers asset packs as IP on Story
```

### What Does NOT Change

✅ **Completely Untouched:**
- `app/games/*` (game generation flow)
- `WriterCoinPayment.sol` (Base payment contract)
- `GameNFT.sol` (Base NFT minting)
- `/api/payments/` routes
- Game AI generation
- Existing payment infrastructure

✅ **Story Protocol is Optional:**
- Assets can exist without Story registration (local marketplace only)
- Revenue tracking works on Base regardless
- Can add Story IP layer later without breaking changes

## Key Resources

- **Official Docs:** https://docs.story.foundation/
- **TypeScript SDK Reference:** https://docs.story.foundation/sdk-reference/overview
- **Registration Example:** https://github.com/storyprotocol/typescript-tutorial/blob/main/scripts/registration/register.ts
- **Full Setup Guide:** `docs/STORY_PROTOCOL_SETUP.md` (in this repo)

## Environment Setup Required

Add to `.env.local`:

```env
# Story Protocol RPC (testnet)
STORY_RPC_URL=https://aeneid.storyrpc.io

# Private key for wallet (get from faucet)
STORY_WALLET_KEY=0x...

# Optional: Custom SPG NFT contract
NEXT_PUBLIC_STORY_SPG_CONTRACT=0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc
```

## File Structure

```
lib/
├── story-protocol.service.ts       ← Main service (skeleton ready)
└── (story-config.ts removed - not needed for v1.4.2)

app/api/ip/
├── register/
│   └── route.ts                     ← Registration endpoint

docs/
├── STORY_PROTOCOL_SETUP.md          ← Complete setup guide
└── HACKATHON.md                     ← Updated with new status

contracts/
├── StoryIPAuthor.sol                ← Author permissions (existing)
└── (can be deprecated once SDK integration is complete)

scripts/
├── deploy-story-ip-author.ts        ← Deployment (existing)
└── approve-author.ts                ← Author approval (existing)
```

## Compilation Status

```bash
# Service compiles cleanly
✅ npx tsc --noEmit lib/story-protocol.service.ts --skipLibCheck

# Full project build has unrelated issues in components
# (wallet-connect imports, missing UI components)
# Story Protocol code itself is clean
```

## Next Developer Notes

1. **SDK Integration Point:** Look at `registerGameAsIP()` function - all TODOs are marked
2. **Type Reference:** Check interfaces at top of `lib/story-protocol.service.ts`
3. **Example Patterns:** Story's official repo has working examples
4. **Testing:** Can test with Aeneid testnet (see faucet link in docs)

## Acceptance Criteria (When Complete)

- [ ] All 6 functions have real SDK implementations
- [ ] Database model created and migrations run
- [ ] API endpoint tested end-to-end
- [ ] Testnet IP Asset registration working
- [ ] License terms attaching working
- [ ] Royalty tracking functional
- [ ] UI updated to show real transaction status
- [ ] Documentation updated with real examples

---

**Status:** Ready for implementation → Production is one sprint away.
