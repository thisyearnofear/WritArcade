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
3. **Generate**: Compile assets into 5-panel comic story
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

## Tech stack

- **Frontend**: Next.js 16 + TypeScript + TailwindCSS + Framer Motion
- **Web3**: wagmi + viem + RainbowKit / WalletConnect
- **Backend**: Next.js API routes + Prisma + PostgreSQL
- **AI**: OpenAI/Anthropic (ai-sdk); Venice AI + Modal + Netmind (images)
- **IP**: Story Protocol (testnet) + IPFS (Pinata)
- **Access Control**: Lit Protocol (NFT-gated encryption)
- **Impact**: Hypercerts (AT Protocol)

## Smart contracts (Base mainnet)

- **GameNFT**: `0x778C87dAA2b284982765688AE22832AADae7dccC`
- **WriterCoinPayment**: `0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75`

Revenue splits enforced on-chain, configurable per writer coin.

## Status

- **Live**: https://writersarcade.vercel.app/
- **Contracts**: Base mainnet (verified on Sourcify)
- **Story Protocol**: Aeneid testnet (IP registration)

---

**writersarcade**: Turn articles into playable, ownable games.
