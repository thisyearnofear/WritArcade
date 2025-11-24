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
- **Purpose**: Handle payments and revenue distribution
- **Functions**:
  - `whitelistCoin(...)` - Add a writer coin to whitelist
  - `removeCoin(coinAddress)` - Remove a writer coin
  - `payForGameGeneration(writerCoin, user)` - Process game generation payment
  - `payForMinting(writerCoin, user)` - Process NFT minting payment

## Deployment Steps

### Phase 1: Base Sepolia Testnet

1. **Deploy GameNFT**
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

3. **Whitelist AVC Coin**
   ```bash
   # Call whitelistCoin with:
   # - coinAddress: 0x06FC3D5D2369561e28F261148576520F5e49D6ea (Base Sepolia)
   # - gameGenerationCost: 100 * 10^18 (100 AVC)
   # - mintCost: 50 * 10^18 (50 AVC)
   # - treasury: Fred Wilson's address
   # - Shares: 6000, 2000, 2000 (game) / 3000, 1500, 500 (mint)
   ```

4. **Update GameNFT Owner**
   ```bash
   # Make WriterCoinPayment contract owner of GameNFT
   # (or create separate minting permission)
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
