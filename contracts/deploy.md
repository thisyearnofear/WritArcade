# Contract Deployment Guide

## Base Mainnet V2

These contracts are deployed on Base mainnet:

- `GameNFT`: `0x32D0356f533cC429F94Db73f383bBb21a459E16b`
- `WriterCoinPayment`: `0x56Ee5A3f122da00B635DdbB319708e24450aEB89`
- `SecretPanelVault`: `0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8` ([Basescan](https://basescan.org/address/0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8))
- `DailyChallengeVault`: `0x0bb738ee11839baa44aa46984997f9417733dcce` ([Basescan](https://basescan.org/address/0x0bb738ee11839baa44aa46984997f9417733dcce))

> **Hardened DailyChallengeVault redeploy (2026-08-08)** — supersedes the initial deploy.
> New address: `0xb420a5cd42be2bae6003ac828c7ed0975aa44693`
> Deploy tx: `0x5bb62ec5e939ab74185cabe33215f279fe727d27f7cbcf333ee9ee07eb39eb9a`

> **DailyChallengeVault v3 (2026-08-12) — per-panel FHE verdicts.** Replaces the
> hardened v2 vault. Adds `panelVerdicts` state, `getPanelVerdictHandle`, and a
> branch-free gradient `_computePanelVerdict` (10 | 6 | 3 | 1) built from
> `min(clockwise, counterClockwise)` ring distance, so the frontend can show
> honest per-choice resonance pings. Branch-free because Inco's `e.select`
> eagerly evaluates both branches and `sub` on a losing branch panics;
> verified by `testPanelVerdictsStoreGradientBands`. `completeAndReveal` is unchanged.
> New address: `0xcc271a53e4286012f3289273fdaa32f66fa64a33`
> Deploy tx: `0x9f836a2e37339c667352e3398884ee359bc8ecfd06f3d1965f266f99c8c2f6ea`
> Note: an intermediate draft of `_computePanelVerdict` was deployed to
> `0xee0573adca0f0bbfcd9cf274b6047fdc32518a74` and `0x556b633914584b9bd12da96123f06d40167dd5ec`
> during testing — both burned a deck on day 1099 and are abandoned.
> Update `NEXT_PUBLIC_DAILY_CHALLENGE_VAULT_ADDRESS` to `0xcc271a53e4286012f3289273fdaa32f66fa64a33`
> in `.env.local`, `.env.production.example`, and the Vercel project. The earlier
> `0xb420a5cd42be2bae6003ac828c7ed0975aa44693` and `0xee0573adca0f0bbfcd9cf274b6047fdc32518a74`
> are NOT the live vault any more and should not be referenced by any consumers.
>
> - Deck exhaustion fix (fresh encrypted cycle before the 11th hand), canonical 1–52
>   modifier IDs, owner-relay + day-match verified `record-choice`, server-driven
>   `reveal`. See `scripts/deploy/deploy-daily-challenge-vault.mjs`.
> - `narrativeOperator` = deployer `0xb8CE765cD679ECB958c0D2869d516C386b9d5a85`
>   (matches the previous vault, so backend Inco decrypt is unchanged).
> - Update `NEXT_PUBLIC_DAILY_CHALLENGE_VAULT_ADDRESS` to the new address in
>   `.env.local` and Vercel. SecretPanelVault was NOT redeployed.
> - Requires source verification on BaseScan and an end-to-end Base smoke run.

Inco vault deploy txs (Aug 2026):

- `SecretPanelVault`: `0x41db3325f2e6e34d773449735b78fb7f2a66714179b37a4db57adf94cfe51119`
- `DailyChallengeVault`: `0x4361a7d3b38e6046e9387b1f668e93ee86dd0f29ee126b6fab052a82852d952d`
- `SecretPanelVault.setGameNFT` (production GameNFT): `0x6c51a3dd0e9a1d04ae44991e2c00f6497d533b7e1b9591e4270e4731db10a208`
- `DailyChallengeVault.createDailyChallenge` (day 1093 initial shuffle): `0xf64513118e2c651dd76aaa9d7005849ac0eb900a5f777d36e8ed534716edf8bd`

**Security**: Never commit `INCO_VAULT_MANAGER_PRIVATE_KEY`, `MEZO_DEPLOYER_PRIVATE_KEY`, or
`STORY_PLATFORM_PRIVATE_KEY`. Store only in Vercel encrypted env vars. The deployer wallet
should not receive production traffic — grant roles to a dedicated server wallet.

Deployment transaction hashes:

- `GameNFT`: `0x3e377e1ef289147092a5c34b93ef5ba228373cbe6199a47c9fef72b2b4a326c3`
- `WriterCoinPayment`: `0xaea2c5d57a4b2b43950e3034acd77951a34c3b36d14309ca28d966bd77a01a35`
- `MINTER_ROLE` grant: `0x890ed9e1d4f56fea99623a03796f106b416386d304e608155a6e283baef71562`

Deploy `GameNFT` first, then `WriterCoinPayment`, then connect them with
`MINTER_ROLE`.

### Local Verification

Install Solidity dependencies first (Bun resolves `@inco/lightning` git deps that pnpm cannot):

```bash
bun add @inco/lightning@1.0.2 @openzeppelin/contracts@5.3.0
```

The shell has another CLI named `forge`, so call Foundry directly:

```bash
cd contracts
/Users/udingethe/.foundry/bin/forge build --offline
/Users/udingethe/.foundry/bin/forge test --match-path test/WriterCoinPayment.t.sol --offline
```

Foundry uses `solc = 0.8.29`, `evm_version = cancun`, optimizer enabled, and `via_ir = true`.
Remappings live in `contracts/remappings.txt` and point at root `node_modules/`.

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

Deploy `SecretPanelVault` and `DailyChallengeVault` (Inco confidential compute):

```bash
cd contracts
/Users/udingethe/.foundry/bin/forge build --offline
cd ..
node scripts/deploy-inco-vaults.mjs
```

`DailyChallengeVault` constructor: `(initialOwner, narrativeOperator)` — set
`narrativeOperator` to the server wallet that decrypts modifier cards for AI
generation (same wallet as `INCO_VAULT_MANAGER_PRIVATE_KEY`).

After deployment, grant roles if deployer ≠ server wallet:

```solidity
grantRole(VAULT_MANAGER_ROLE, SERVER_WALLET)
grantRole(SESSION_MANAGER_ROLE, SERVER_WALLET)
```

### 5. Deploy SecretPanelVault (legacy section — see deploy script above)

Contract: `contracts/src/SecretPanelVault.sol`

This contract stores encrypted secret panel epilogues and Wordle answers using
Inco's confidential compute layer. Replaces Lit Protocol and Story CDR.

Constructor:

```solidity
constructor(address initialOwner, address _gameNFT)
```

Recommended arguments:

- `initialOwner`: owner/admin wallet (same as GameNFT owner)
- `_gameNFT`: the deployed `GameNFT` address

After deployment:

1. Grant `VAULT_MANAGER_ROLE` to the server wallet that will call `storeSecretPanel`:

```solidity
grantRole(VAULT_MANAGER_ROLE, SERVER_WALLET_ADDRESS)
```

2. The `VAULT_MANAGER_ROLE` keccak hash:

```text
0x...
```

3. Fund the server wallet with Base ETH for gas + Inco fees.

### 6. Update App Environment

Set these in Vercel and local `.env.local`:

```bash
NEXT_PUBLIC_GAME_NFT_MAINNET="0x32D0356f533cC429F94Db73f383bBb21a459E16b"
NEXT_PUBLIC_WRITER_COIN_PAYMENT_MAINNET="0x56Ee5A3f122da00B635DdbB319708e24450aEB89"
NEXT_PUBLIC_GAME_NFT_ADDRESS="0x32D0356f533cC429F94Db73f383bBb21a459E16b"
NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS="0x56Ee5A3f122da00B635DdbB319708e24450aEB89"

# Inco — Secret Panel Vault
FEATURE_INCO="true"
NEXT_PUBLIC_INCO_NETWORK="baseMainnet"
NEXT_PUBLIC_SECRET_PANEL_VAULT_ADDRESS="<deployed SecretPanelVault address>"
INCO_VAULT_MANAGER_PRIVATE_KEY="<server wallet private key>"
```

Whitelisted writer treasuries:

- AVC / Fred Wilson: `0x1017aC960508d955E30dECa7fe9216BddA777B20`
- Debbie Soon: `0xA9F7c123CB756aF83d79AD02A216DC7606B8e58A`
- Blog of Jake: `0x5baA44bb6B7bd79C89628696F1186bCaEb3453AA`
- Tso Thoughts: `0xf6D4e5A63A7C42EBF639B6AFB9613E8eFcA1C7DA`
- Papa: `0x55A5705453Ee82c742274154136Fce8149597058`

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

- `SecretPanelVault.sol`: Inco confidential compute vault for encrypted secret panels (Base mainnet).
- `GameNFTMezo.sol`: open-mint Mezo testnet NFT contract.
- `MezoBoostedSplitter.sol`: MUSD splitter with MEZO-holder boost.
- `MezoPaymentSplitter.sol`: earlier MUSD splitter.

Do not redeploy these as part of the Base writer-coin payment fix unless the
Mezo flow is being intentionally changed.
