# Contract Deployment Guide

## Smart Contracts

### 1. GameNFT.sol
- **Purpose**: ERC-721 NFT contract for minting generated games
- **Functions**:
  - `mintGame(to, tokenURI, metadata)` - Mint a new game NFT
  - `getGameMetadata(tokenId)` - Get metadata for a game
  - `getCreatorGames(creator)` - Get all games created by a user
  - `getTotalGamesMinted()` - Get total games minted
  - `tokenExists(tokenId)` - Check if token exists

### 2. WriterCoinPayment.sol
-3. **WriterCoinPayment**: Handles payments and revenue distribution.
   - Now supports `payForGameplay` (V2) for dynamic creator/writer/platform splits.
   - Requires `PlatformTreasury` and `CreatorPool` addresses.
   - Must `setGameNFT` after deployment. to whitelist
  - `removeCoin(coinAddress)` - Remove a writer coin
  - `payForGameGeneration(writerCoin, user)` - Process game generation payment
  - `payForMinting(writerCoin, user)` - Process NFT minting payment
  - `payAndMintGame(writerCoin, tokenURI, metadata)` - Process payment and mint NFT atomically

### 3. MezoBoostedSplitter.sol
- **Purpose**: MUSD payment and revenue split contract for the Mezo network with native MEZO holder revenue boost.
- **Functions**:
  - `isMezoHolder(address user)` - Check if user holds >= 1 MEZO.
  - `payAndMintGame(string tokenURI, GameMetadata metadata)` - Atomic pay and mint; automatically applies a 10% creator revenue boost for MEZO holders.

## Deployment Steps

...

### Phase 3: Mezo Matsnet (Testnet)

1. **Deploy MezoBoostedSplitter**
   ```bash
   # Arguments: MUSD_ADDRESS PRECOMPILE_ADDRESS PLATFORM_TREASURY_ADDRESS
   # PRECOMPILE: 0x7B7c000000000000000000000000000000000001
   ./scripts/deploy-mezo.sh
   ```

2. **Configure Environment**
   - Update `NEXT_PUBLIC_MEZO_PAYMENT_SPLITTER_TESTNET` in `.env.local`.

3. **Verify**
   - Check Mezo Explorer for contract deployment.

## Safety Checks (MezoBoostedSplitter)

- ✅ Static call to MEZO system precompile for real-time holder status.
- ✅ Proportionate reduction of platform fee to fund boosts.
- ✅ ReentrancyGuard on pay/mint functions.
- ✅ MUSD token balance check before transfer.
   ```bash
   # Deploy to Sepolia
   # Owner will be deployer address
   ```

2. **Deploy WriterCoinPayment**
   ```bash
   # Deploy with:
   # - platformTreasury: WritArcade team address
   # - creatorPool: Community pool address
   ```

3. **Link Contracts**
   ```bash
   # 1. Get MINTER_ROLE from GameNFT
   # 2. Grant MINTER_ROLE to WriterCoinPayment address on GameNFT
   # 3. Call setGameNFT(GameNFT_Address) on WriterCoinPayment
   ```

4. **Whitelist AVC Coin**
   ```bash
   # Call whitelistCoin with:
   # - coinAddress: 0x06FC3D5D2369561e28F261148576520F5e49D6ea (Base Sepolia)
   # - gameGenerationCost: 100 * 10^18 (100 AVC)
   # - mintCost: 50 * 10^18 (50 AVC)
   # - treasury: Fred Wilson's address
   # - Shares (Game): 6000 (Writer), 2000 (Platform), 2000 (Pool)
   # - Shares (Mint): 1500 (Writer), 500 (Platform), 3000 (Creator) [Balance -> User]
   ```

### Phase 2: Base Mainnet

1. **Same deployment process**
2. **Update writer coin addresses** to mainnet versions
3. **Verify contracts** on Basescan

## Configuration

### AVC Token (Base Sepolia)
- Address: `0x06FC3D5D2369561e28F261148576520F5e49D6ea`
- Decimals: 18
- Game cost: 100 AVC
- Mint cost: 50 AVC

### Addresses (To be set)
- Platform Treasury: `0x...` (WritArcade team)
- Creator Pool: `0x...` (Community pool)
- Writer Treasury: `0x...` (Fred Wilson)

## Testing

### Unit Tests
```bash
npx hardhat test
```

### Integration Tests
1. Whitelist AVC coin
2. Approve tokens
3. Call payForGameGeneration
4. Verify token distribution
5. Mint NFT via GameNFT

### Frontend Integration
1. Connect wallet (RainbowKit)
2. Approve writer coin spending
3. Call WriterCoinPayment.payForGameGeneration
4. Wait for confirmation
5. Call backend to generate game
6. Display result in GamePlayer

## Safety Checks

- ✅ ReentrancyGuard on payment functions
- ✅ Owner-only functions for configuration
- ✅ Zero address checks
- ✅ Basis point validation (must total 10000)
- ✅ Token approval verification
- ✅ Safe math (Solidity 0.8.20+ has overflow protection)

## Next Steps

1. Set up Hardhat project with contracts
2. Write unit tests
3. Deploy to Sepolia testnet
4. Test full flow (payment → generation → minting)
5. Deploy to Base mainnet (Week 5)
