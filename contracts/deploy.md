# Contract Deployment Guide

## Base Mainnet V2

These contracts are intended for a fresh Base mainnet deployment through Remix.
Deploy `GameNFT` first, then `WriterCoinPayment`, then connect them with
`MINTER_ROLE`.

### Local Verification

The shell has another CLI named `forge`, so call Foundry directly:

```bash
cd contracts
/Users/udingethe/.foundry/bin/forge build --contracts . --offline
/Users/udingethe/.foundry/bin/forge test --contracts . --match-path test/WriterCoinPayment.t.sol --offline
```

Foundry uses `solc = 0.8.25`, optimizer enabled, and `via_ir = true`.

### 1. Deploy GameNFT

Contract: `contracts/GameNFT.sol`

Constructor:

```solidity
constructor(
    address initialOwner,
    string memory initialContractURI,
    address royaltyReceiver,
    uint96 royaltyFeeNumerator
)
```

Recommended arguments:

- `initialOwner`: owner/admin wallet.
- `initialContractURI`: collection metadata URI, or `""` until ready.
- `royaltyReceiver`: royalty wallet, or `0x0000000000000000000000000000000000000000` to disable initially.
- `royaltyFeeNumerator`: basis points out of 10,000. Example: `500` = 5%.

Features:

- ERC-721 with `tokenURI`.
- `MINTER_ROLE` controlled minting.
- ERC-2981 default royalties.
- `contractURI()` for marketplace collection metadata.
- Owner-controlled `setMintingPaused(bool)`.
- Two-step ownership transfer through `Ownable2Step`.

### 2. Deploy WriterCoinPayment

Contract: `contracts/WriterCoinPayment.sol`

Constructor:

```solidity
constructor(
    address initialOwner,
    address _platformTreasury,
    address _creatorPool,
    address _gameNFT
)
```

Recommended arguments:

- `initialOwner`: owner/admin wallet.
- `_platformTreasury`: WritArcade treasury.
- `_creatorPool`: community/creator-pool wallet.
- `_gameNFT`: new `GameNFT` address.

Key fix:

- `payAndMintGame` now pulls the full configured `mintCost` first.
- It then distributes creator, writer, and platform shares.
- Any undistributed mint remainder is refunded to the minter.
- The payment contract does not need to hold a pre-funded token balance.

### 3. Grant MINTER_ROLE

On `GameNFT`, call:

```solidity
grantRole(MINTER_ROLE, WRITER_COIN_PAYMENT_ADDRESS)
```

You can get `MINTER_ROLE` from the public constant in Remix, or use:

```text
0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6
```

After the new payment contract is live, revoke the old payment contract:

```solidity
revokeRole(MINTER_ROLE, OLD_WRITER_COIN_PAYMENT_ADDRESS)
```

### 4. Whitelist Writer Coins

On `WriterCoinPayment`, call `whitelistCoin` once per Base writer coin:

```solidity
whitelistCoin(
    coinAddress,
    gameGenerationCost,
    mintCost,
    treasury,
    writerShare,
    platformShare,
    creatorPoolShare,
    mintCreatorShare,
    mintWriterShare,
    mintPlatformShare,
    playCreatorShare,
    playWriterShare,
    playPlatformShare
)
```

Current default split:

- Generation: `6000, 2000, 2000`.
- Minting: `5000, 1500, 500`; the remaining 30% is refunded to the minter.
- Gameplay: `8000, 1000, 1000`.

Current default costs:

- Generation: `100000000000000000000` for 100 tokens.
- Minting: `50000000000000000000` for 50 tokens.

### 5. Update App Environment

Set these in Vercel and local `.env.local`:

```bash
NEXT_PUBLIC_GAME_NFT_MAINNET="0x..."
NEXT_PUBLIC_WRITER_COIN_PAYMENT_MAINNET="0x..."
NEXT_PUBLIC_GAME_NFT_ADDRESS="0x..."
NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS="0x..."
```

The app uses these for:

- Writer coin mint/payment config.
- Server-side payment verification.
- Footer Basescan links.
- Lit Protocol NFT-gated secret panels.

### 6. Post-Deploy Smoke Tests

1. Check `WriterCoinPayment.gameNFT()` returns the new `GameNFT`.
2. Check each writer coin `getCoinConfig(coin).enabled` is `true`.
3. Check each `mintDistributions(coin)` returns the intended split.
4. Approve exactly the mint cost for a test writer coin.
5. Call `payAndMintGame`.
6. Confirm:
   - NFT owner is the minter.
   - Writer treasury receives its mint share.
   - Platform treasury receives its mint share.
   - Payment contract token balance remains `0`.

## Mezo Contracts

The Mezo contracts under `contracts/src` are separate from the Base redeploy:

- `GameNFTMezo.sol`: open-mint Mezo testnet NFT contract.
- `MezoBoostedSplitter.sol`: MUSD splitter with MEZO-holder boost.
- `MezoPaymentSplitter.sol`: earlier MUSD splitter.

Do not redeploy these as part of the Base writer-coin payment fix unless the
Mezo flow is being intentionally changed.
