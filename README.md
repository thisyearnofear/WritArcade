# writersarcade

Turn Paragraph.xyz articles into interactive, mintable games. Players pay with writer coins, creators mint and share games, and revenue splits are enforced on-chain.

## What it does

- **Generate playable stories** from article URLs, marketing copy, or any pasted text (`/studio`)
- **No wallet required to start**: try one free story, then upgrade with credits or crypto
- **Interactive comic player**: 5-panel narratives where reader choices shape the outcome
- **Embeddable player**: wallet-free iframe (`/embed/[slug]`) with `?ref=` attribution and a "Made with WritersArcade" backlink
- **Resonance analytics**: creator dashboard showing starts, completions, panel funnel, and which choices framings readers prefer
- **Advanced Customization**: Edit extracted assets (characters, story beats) in the Workshop
- **Creative Control**: Regenerate panel images and edit narrative text before minting
- Mint games as NFTs on Base; browse and play recent games
- Pay with writer coins (ERC-20 on Base) using RainbowKit/WalletConnect, or buy credits with fiat
- **Story Protocol Integration**: Register games and assets as IP with configurable licenses
- **Inco Integration**: NFT-gated secret panels + daily challenge modifier deck on Base mainnet
- **Daily Challenge**: `/daily` — encrypted 52-card deck, BasePaint crossover, leaderboard
- **Hypercerts Integration**: Auto-created impact certificates certifying creative collaboration
- Configurable, on-chain revenue splits for generation and minting

## Core flow

1. **Input**: Paste article URL → AI extracts assets
2. **Customize** (Optional): Edit characters & mechanics in Workshop
3. **Generate**: Complete payment → compile assets into 5-panel comic story
4. **Refine**: Regenerate images with custom prompts + edit text
5. **Register**: Mint NFT & register IP on Story Protocol (user-owned)
6. **Revenue**: Splits executed on-chain (Writer/Platform/Creator)

## Quick start

```bash
pnpm install
cp .env.example .env.local  # Edit with your API keys
pnpm dev
# Open http://localhost:3000
```

See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) for full setup.

## Documentation

| Doc | Purpose |
|-----|---------|
| [Architecture](./docs/ARCHITECTURE.md) | System design, tech stack, data models, smart contracts |
| [Development](./docs/DEVELOPMENT.md) | Setup, commands, environment, API endpoints, troubleshooting |
| [Features](./docs/FEATURES.md) | Platform features, integrations (Story, Inco, Hypercerts), writer coins |
| [Roadmap](./docs/ROADMAP.md) | Completed phases, current status, future plans |
| [Hackathon Submission](./HACKATHON_SUBMISSION.md) | Mezo Hackathon submission — MUSD track, architecture, contracts |

## Tech stack

- **Frontend**: Next.js 16 + TypeScript + TailwindCSS + Framer Motion
- **Web3**: wagmi + viem + RainbowKit / WalletConnect
- **Backend**: Next.js API routes + Prisma + PostgreSQL
- **AI**: OpenAI/Anthropic (ai-sdk); Venice AI + Modal + Netmind (images)
- **IP**: Story Protocol (testnet) + IPFS (Pinata primary, Grove fallback)
- **Access Control**: Inco (`@inco/lightning-js` + `@inco/lightning`) — secret panels, Wordle answers, daily challenge sessions
- **Impact**: Hypercerts (AT Protocol)

## Smart contracts

**Base mainnet** (production writer-coin payments)
- **GameNFT**: `NEXT_PUBLIC_GAME_NFT_MAINNET` — [`0x32D0356f533cC429F94Db73f383bBb21a459E16b`](https://basescan.org/address/0x32D0356f533cC429F94Db73f383bBb21a459E16b)
- **WriterCoinPayment**: `NEXT_PUBLIC_WRITER_COIN_PAYMENT_MAINNET`
- **SecretPanelVault**: [`0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8`](https://basescan.org/address/0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8)
- **DailyChallengeVault**: [`0x0bb738ee11839baa44aa46984997f9417733dcce`](https://basescan.org/address/0x0bb738ee11839baa44aa46984997f9417733dcce)
- Deployment guide: [contracts/deploy.md](./contracts/deploy.md)

**Mezo Matsnet (testnet)** — Mezo Hackathon, MUSD track
- **MezoPaymentSplitter**: [`0x32D0356f533cC429F94Db73f383bBb21a459E16b`](https://explorer.test.mezo.org/address/0x32D0356f533cC429F94Db73f383bBb21a459E16b)
- **MUSD token**: `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`
- **MEZO token** (read-only, holder perks): `0x7B7c000000000000000000000000000000000001`
- Pay 1 MUSD to generate a game; splitter atomically forwards platform / writer / creator shares on-chain.
- **MezoBoostedSplitter** (v2): [`0x56Ee5A3f122da00B635DdbB319708e24450aEB89`](https://explorer.test.mezo.org/address/0x56Ee5A3f122da00B635DdbB319708e24450aEB89) — deployed May 2026; 10% creator share boost for MEZO holders.
- MEZO holders see a "MEZO Holder" badge in the payment flow; boosted splits enforced on-chain via MezoBoostedSplitter.

Revenue splits enforced on-chain, configurable per writer coin.

## Status

- **Live**: https://writersarcade.vercel.app/
- **Contracts**: Base mainnet (verified on Sourcify)
- **Story Protocol**: Aeneid testnet (IP registration)

---

## Etherfuse Ramp API (Fiat Onramp)

Let users buy USDC with fiat via Etherfuse to purchase game credits.

### How it works

1. **Quote**: User requests a USD→USDC conversion quote via `GET /api/ramp/quote`
2. **Order**: User creates a ramp order via `POST /api/ramp/order` (returns Etherfuse widget URL)
3. **KYC + Payment**: User completes KYC and payment in the Etherfuse widget
4. **Webhook**: Etherfuse sends `POST /api/ramp/webhook` on payment completion
5. **Credits**: Credits are added to the user's account (1 credit = $0.10 USD)

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ramp/quote` | POST | Get fiat→crypto conversion quote |
| `/api/ramp/order` | POST | Create ramp order, get widget URL |
| `/api/ramp/webhook` | POST | Receive payment confirmation from Etherfuse |
| `/api/ramp/credits` | GET | Query user's credit balance |

### UI

- **Buy Credits button** in the header — shows balance, opens modal with amount selection
- Credits displayed in `balance-display.tsx` and the header banner
- Buy Credits flow integrated as an enhancement to the existing header

### Environment

```bash
ETHERFUSE_API_KEY="your-api-key"
ETHERFUSE_API_URL="https://api.sand.etherfuse.com"   # sandbox
ETHERFUSE_WEBHOOK_SECRET="your-webhook-secret"
```

See `.env.example` for all variables.

---

## SuperRare NFT Integration

Mint game artifacts (character cards, story panels, achievement badges, limited endings) as SuperRare NFTs.

### How it works

1. **Owner navigates** to any game's artifact view
2. **Clicks** "Collect as SuperRare NFT" in the SuperRare section
3. **POST /api/superrare/mint** prepares the metadata and mints payload
4. **User confirms** in their wallet (SuperRare V2 shared minting contract)
5. **PATCH /api/superrare/mint** confirms the mint, saves `superrareTokenId` to the game

### Collectible types

- **Character cards**: Game characters extracted as standalone NFT art
- **Story artifacts**: Key narrative moments as collectible panels
- **Achievement badges**: Limited-edition badges for game completion
- **Limited edition endings**: Rare story endings as exclusive NFTs

### UI Locations

- **Game artifact view**: "Collect as SuperRare NFT" button in the NFT section
- **My Games → NFT Gallery**: Tab showing all SuperRare-minted games
- **Header**: SuperRare items show a pink badge

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/superrare/mint` | POST | Prepare SuperRare NFT mint (metadata, IPFS) |
| `/api/superrare/mint` | PATCH | Confirm mint after on-chain transaction |

### SuperRare GraphQL

Query user NFTs on SuperRare:

```graphql
query GetNftsByOwner($owner: String!) {
  getNfts(filter: { ownerAddress: { equals: $owner } }, pagination: { take: 50 }) {
    nfts { tokenId contractAddress metadata { name proxyMedia { image { medium } } } }
    pagination { total }
  }
}
```

### Environment

```bash
SUPERRARE_API_KEY="your-api-key"
SUPERRARE_API_URL="https://api.superrare.com"
SUPERRARE_CONTRACT_ADDRESS="0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0"
```

---

## Hackathon Targets

| Sponsor | Track | Prize | Implementation |
|---------|-------|-------|----------------|
| Etherfuse | General | $1,000 USD | Fiat onramp → game credits (`lib/etherfuse.ts`, `app/api/ramp/*`) |
| SuperRare | General | $700 USDC | NFT collectibles for game artifacts (`lib/superrare.ts`, `app/api/superrare/mint`) |
| SuperRare | Startups | $700 USDC | Premium game collectibles |
| Arbitrum | General | $380 USDC | Base (Arbitrum Nova family) — existing Base integration |
| Arbitrum | Startups | $650 USDC | Cross-chain DeFi |
| Bitso | General | $1,100 USDC | Stablecoin payments via Etherfuse USDC on Base |

---

**writersarcade**: Turn articles into playable, ownable games.
