# writersarcade

Turn Paragraph.xyz articles into interactive, mintable games. Players pay with writer coins, creators mint and share games, and revenue splits are enforced on-chain.

## What it does

- Generate playable games from article URLs (mini-app and web)
- **Advanced Customization**: Edit extracted assets (characters, story beats) in the Workshop
- **Creative Control**: Regenerate panel images and edit narrative text before minting
- Mint games as NFTs on Base; browse and play recent games
- Pay with writer coins (ERC-20 on Base) using RainbowKit/WalletConnect
- **Story Protocol Integration**: Register games and assets as IP with configurable licenses
- **Lit Protocol Integration**: NFT-gated "Secret Panels" — encrypted epilogues only NFT holders can decrypt
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
| [Features](./docs/FEATURES.md) | Platform features, integrations (Story, Lit, Hypercerts), writer coins |
| [Roadmap](./docs/ROADMAP.md) | Completed phases, current status, future plans |
| [Hackathon Submission](./HACKATHON_SUBMISSION.md) | Mezo Hackathon submission — MUSD track, architecture, contracts |

## Tech stack

- **Frontend**: Next.js 16 + TypeScript + TailwindCSS + Framer Motion
- **Web3**: wagmi + viem + RainbowKit / WalletConnect
- **Backend**: Next.js API routes + Prisma + PostgreSQL
- **AI**: OpenAI/Anthropic (ai-sdk); Venice AI + Modal + Netmind (images)
- **IP**: Story Protocol (testnet) + IPFS (Pinata)
- **Access Control**: Lit Protocol (NFT-gated encryption)
- **Impact**: Hypercerts (AT Protocol)

## Smart contracts

**Base mainnet** (production writer-coin payments)
- **GameNFT**: `0x778C87dAA2b284982765688AE22832AADae7dccC`
- **WriterCoinPayment**: `0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75`

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

**writersarcade**: Turn articles into playable, ownable games.
