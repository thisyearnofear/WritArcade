# writersarcade

Turn Paragraph.xyz articles into interactive, mintable games. Players pay with writer coins, creators mint and share games, and revenue splits are enforced on-chain.

## BasePaint Hackathon submission (Aug 1–8)

**Category:** Art projects — games and remixes made with BasePaint.

**What it does with BasePaint.** The Daily Challenge (`/basepaint`, also `/daily`) stages a
featured writer's Paragraph article *inside today's BasePaint canvas*. Everyone plays the same
world each day; each player is dealt a private hand of five encrypted modifier cards held in
Inco vaults on Base mainnet, so the same source produces a different story per player. Scores
compare on a leaderboard. Canvas art is read from BasePaint's own APIs — the theme endpoint for
the day's palette and prompt, and `api/art/image` for the artwork itself, which is fed to a
vision model so generated comics are grounded in the actual pixels rather than just the theme
text.

**Why it's useful to BasePaint.** It gives each daily canvas a second life as something
playable, and routes readers of writers like Fred Wilson and Debbie Soon into BasePaint art
they would not otherwise encounter. The daily cadence is the point, not a feature: a new canvas
becomes a new game every day, on a cron, indefinitely.

**Built during the hackathon window** (42 commits, Aug 4–8):

| Change | Commits |
|---|---|
| Dual-source Daily — featured Paragraph article auto-picked from writer-coin publications, staged in today's BasePaint world | `feat(daily): dual-source Daily with Paragraph auto-pick and BasePaint world` |
| Comics grounded in the real canvas via vision model, not just the theme string | `feat(daily): ground BasePaint comics in the actual canvas` |
| Encrypted modifier deck + NFT-gated secret panels migrated to on-chain Inco vaults | `feat(inco): migrate secret panels and daily challenge to on-chain vaults` |
| BasePaint generate flow wired end to end; deck shuffle hardened with fallbacks | `feat(daily): wire BasePaint generate flow and harden deck shuffle`, `feat(daily): add deck shuffle fallbacks for Hobby Vercel cron` |
| Daily vault redeployed on Base mainnet; VPS daily cron wired | `feat(daily): harden DailyChallenge + redeploy vault on Base mainnet`, `chore: finish lib/scripts reorg and wire VPS daily cron` |
| Canvas URL fix, Base as default chain, client-bundle feature flag | `fix(daily): repair BasePaint canvas URL and default wallet to Base`, `fix(daily): enable feature flag in client bundle` |
| Paid-session resume + money-safe onboarding for the Daily path | `fix(daily): resume paid sessions and add money-safe onboarding UX` |
| Landing page rebuilt around the work: today's canvas rendered in the Daily banner, BasePaint surfaced above the fold, one primary CTA, progressive disclosure | `feat(ux)` series |

Implementation notes and the dual-source design live in [`docs/BASEPAINT.md`](docs/BASEPAINT.md).
BasePaint constants, canvas/theme URLs, and the day-epoch calculation are in
[`lib/basepaint/`](lib/basepaint/).

## What it does

- **Generate playable stories** from article URLs, marketing copy, or any pasted text (`/studio`)
- **iMessage agent (Flynn)**: text a link to prose and get a playable story back, with optional natural-language tone
- **No wallet required to start**: try one free story, then upgrade with credits or crypto
- **Interactive comic player**: 5-panel narratives where reader choices shape the outcome
- **Embeddable player**: wallet-free iframe (`/embed/[slug]`) with `?ref=` attribution and a "Made with WritersArcade" backlink
- **Resonance analytics**: creator dashboard showing starts, completions, panel funnel, and which choices framings readers prefer
- **Advanced Customization**: Edit extracted assets (characters, story beats), endings, and IP in the Workshop after the core story exists
- **Creative Control**: Regenerate panel images and edit narrative text before minting
- Mint games as NFTs on Base; browse and play recent games
- Pay with writer coins (ERC-20 on Base) using RainbowKit/WalletConnect, or buy credits with fiat
- **Story Protocol Integration**: Register games and assets as IP with configurable licenses
- **Inco Integration**: NFT-gated secret panels + Daily Challenge modifier deck on Base mainnet
- **Daily Challenge**: `/basepaint` (also `/daily`) — dual source (Paragraph featured article + today's BasePaint canvas), encrypted Inco modifier hand, leaderboard
- **Featured article**: auto-picked daily from writer-coin Paragraph pubs (override via ops API); Create can optionally stage any article in today's canvas
- **BasePaint docs**: [`docs/BASEPAINT.md`](docs/BASEPAINT.md) — dual-source Daily + Paragraph auto-pick inside writersarcade
- **Hypercerts Integration**: Auto-created impact certificates certifying creative collaboration
- Configurable, on-chain revenue splits for generation and minting

## Core flow

The first-run creation path is intentionally compact: **Source → Story direction → Generate**.

1. **Source**: Paste an article URL or supported copy and preview it
2. **Story direction**: Choose tone and story intensity; visual finish and payment details are optional advanced controls
3. **Generate**: Complete the required payment/free path and create a 5-panel playable story
4. **Play**: Make choices that shape the narrative and resolution
5. **Expand**: Share, own/unlock, inspect reader insights, or optionally animate the completed comic
6. **Refine**: Use Workshop/Creator Studio for deeper asset, ending, model, and IP controls

The first-run path does not require users to understand wallets, chains, tokens, model providers, NFTs, or Story Protocol.

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
| [Inco Integration](./docs/INCO_INTEGRATION.md) | How Inco powers the game — encrypted deck, FHE scoring, NFT-gated content (Summer Game Jam submission) |
| [Development](./docs/DEVELOPMENT.md) | Setup, commands, environment, API endpoints, troubleshooting |
| [Features](./docs/FEATURES.md) | Platform features, integrations (Story, Inco, Hypercerts), writer coins |
| [BasePaint](./docs/BASEPAINT.md) | Dual-source Daily, Paragraph auto-pick, Create staging, Inco |
| [iMessage Agent (Flynn)](./docs/IMESSAGE_AGENT.md) | Spectrum iMessage agent that turns article links into playable stories |
| [Video Artifact Pipeline](./docs/VIDEO_ARTIFACT_PIPELINE.md) | Hero animation flow, Runware fallbacks, limits, persistence, recovery, and analytics |
| [Creation UX](./docs/CREATION_UX.md) | Compact mobile-first creation contract, optionality, validation, and success metrics |
| [Roadmap](./docs/ROADMAP.md) | Completed phases, current status, future plans |

## Tech stack

- **Frontend**: Next.js 16 + TypeScript + TailwindCSS + Framer Motion
- **Web3**: wagmi + viem + RainbowKit / WalletConnect
- **Backend**: Next.js API routes + Prisma + PostgreSQL
- **AI**: OpenAI/Anthropic (ai-sdk); Venice AI + Modal + Netmind (images); Runware + Luma + fal + Replicate (hero video fallbacks)
- **IP**: Story Protocol (testnet) + IPFS (Pinata primary, Grove metadata fallback; Pinata binary storage required for durable hero video)
- **Access Control**: Inco (`@inco/lightning-js` + `@inco/lightning`) — secret panels, Wordle answers, daily challenge sessions
- **Impact**: Hypercerts (AT Protocol)

## Smart contracts

**Base mainnet** (production writer-coin payments)
- **GameNFT**: `NEXT_PUBLIC_GAME_NFT_MAINNET` — [`0x32D0356f533cC429F94Db73f383bBb21a459E16b`](https://basescan.org/address/0x32D0356f533cC429F94Db73f383bBb21a459E16b)
- **WriterCoinPayment**: `NEXT_PUBLIC_WRITER_COIN_PAYMENT_MAINNET`
- **SecretPanelVault**: [`0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8`](https://basescan.org/address/0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8)
- **DailyChallengeVault** (v3 — per-panel FHE verdicts, gradient scoring, 2026-08-12): [`0xcc271a53e4286012f3289273fdaa32f66fa64a33`](https://basescan.org/address/0xcc271a53e4286012f3289273fdaa32f66fa64a33)
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

**writersarcade**: Turn writing into playable, ownable games — Daily Challenge stages a featured article inside today's BasePaint canvas, with your secret Inco hand.
