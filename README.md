# WritArcade

Transform articles into mintable games where newsletter/blog readers can spend memecoin to generate customizable games and track usage onchain.

## Documentation

For detailed information about WritArcade, please refer to our consolidated documentation:

- **[Development Status](./docs/STATUS.md)** - Current progress, completed tasks, and next week priorities
- **[Product Roadmap](./docs/ROADMAP.md)** - 5-week MVP plan, tokenomics, and competitive advantages
- **[Implementation Plan](./docs/NEXT_STEPS.md)** - Week-by-week technical tasks and deliverables
- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System design, database schema, and onchain integration
- **[Setup Guide](./docs/IMPLEMENTATION.md)** - Migration guide and development setup
- **[Mini App Migration](./docs/MINI_APP_MIGRATION.md)** - November 2025 SDK upgrade notes (Frames v2 → Mini Apps)

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your environment variables (see `.env.example`)
4. Configure your database connection
5. Run the development server: `npm run dev`

For detailed setup instructions, see the [Implementation Guide](./docs/IMPLEMENTATION.md).

## Core Features

- **Article-to-Game Pipeline**: URL scraping → AI game generation → Interactive gameplay
- **Customizable Parameters**: Genre, style, colors, AI models, prompt variations
- **Content Sources**: HackerNews, direct URLs, custom text input
- **Interactive Gameplay**: Streaming chat-based game mechanics with options
- **Onchain Integration**: Game NFTs, memecoin payments, creator revenue sharing
- **Farcaster Native**: Social features leveraging existing Farcaster profiles

## Tech Stack

- **Frontend**: Next.js 16, React 19.2, TypeScript
- **Backend**: Node.js, PostgreSQL with Prisma ORM
- **Blockchain**: Base network, smart contracts for NFTs
- **Wallets**: WalletConnect, Coinbase Smart Wallet
- **AI Services**: OpenAI, Anthropic integration
- **Deployment**: Vercel with edge functions

## Architecture Highlights

- **Domain-driven design** with clean separation of concerns
- **Farcaster-native identity** leveraging existing social profiles
- **Wallet-first authentication** with minimal PII storage
- **Performance-first** with caching and streaming responses
- **Modular, testable** components and services

---

*For complete information about setup, development, and architecture decisions, see our documentation files.*