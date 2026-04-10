# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development commands

All commands are intended to be run from the repo root.

### Install & run locally

```bash
npm install
# If you hit peer dependency issues:
# npm install --legacy-peer-deps

npm run dev
# Web app:     http://localhost:3000/
# Mini app:    http://localhost:3000/mini-app
```

### Linting and type-checking

```bash
# ESLint 9 flat config
npm run lint

# TypeScript type check only
npm run type-check
```

### Build & production

```bash
# Push Prisma schema to the database, then build Next.js with webpack
npm run build

# Start the built app
npm run start
```

Notes:
- `npm run build` runs `prisma db push --skip-generate` before the Next.js build. Ensure `DATABASE_URL` points at the correct Postgres instance before building.
- Dev uses Turbopack (`next dev --turbopack`), while production builds use webpack (`next build --webpack`).

### Database utilities (Prisma + Postgres)

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to the database (no migrations table)
npm run db:push

# Create a dev migration and apply it interactively
npm run db:migrate

# Open Prisma Studio
npm run db:studio

# One-shot setup: generate client + push schema
npm run db:setup
```

Additional migration commands (from docs, not wired as npm scripts):

```bash
# Apply existing migrations in a deployed environment
npx prisma migrate deploy

# Reset dev database (DANGER: drops data)
npx prisma migrate reset
```

### One-off scripts

```bash
# Data migration / backfill script
npm run migrate:data

# Misc. project-specific scripts live in scripts/
# (e.g., phase-5b-verify.ts)
```

### Testing

There is currently no dedicated automated test runner script (no `npm test` / Jest / Vitest configuration in this repo). Testing is primarily manual via the flows described in `docs/consolidated_development.md` (web app, mini app, and API endpoint checks).

If you introduce a test runner, prefer to add explicit npm scripts (e.g. `test`, `test:unit`) and avoid relying on framework-specific defaults that are not declared in `package.json`.

---

## High-level architecture

WritArcade is a unified Next.js 16 + TypeScript codebase that serves two closely related products:

1. **Quick Games** – transform a single article into a complete, playable game in ~2 minutes (current MVP).
2. **Asset Marketplace** – decompose articles into reusable game assets and compose collaborative games from those assets.

Both products share the same infrastructure (wallet abstraction, payment logic, AI services, database) but are kept architecturally separated at the domain and routing level.

### Top-level structure

- `app/` – Next.js 16 App Router tree for both web app and Farcaster mini app.
- `components/` – Shared React components, with `components/game/` and `components/ui/` providing most of the reusable UI for games and payments.
- `domains/` – Domain logic layer (non-UI) organized by business domain (games, assets, payments, content, users).
- `lib/` – Cross-cutting infrastructure and integration utilities (wallet abstraction, Farcaster SDK integration, Paragraph + Story Protocol clients, contract helpers, etc.).
- `contracts/` – Solidity contracts (`WriterCoinPayment.sol`, `GameNFT.sol`) plus deployment notes.
- `prisma/` – Prisma schema (`schema.prisma`) and database-related helpers.
- `scripts/` – One-off operational scripts (verification, migrations, Story/IP setup, etc.).

### App Router and products

The Next.js App Router is used for both the browser web app and the Farcaster Mini App.

- **Mini App**
  - Root: `app/mini-app/`
  - Uses `@farcaster/miniapp-sdk` via `lib/farcaster.ts`.
  - Critical requirement: call `sdk.actions.ready()` (wrapped in `readyMiniApp()`) once the UI is ready; otherwise the Mini App splash screen will hang.
  - Mini-app–scoped API routes live under `app/mini-app/api/...` but reuse the same domain services as the web app.

- **Web app**
  - Core gameplay and browsing routes live under `app/games/`, `app/generate/`, `app/my-games/`, and `app/assets/`.
  - All HTTP APIs are defined under `app/api/...` and are designed to be **environment-agnostic**, i.e. used by both the web app and Mini App.

### Unified API surface

HTTP endpoints are intentionally unified so that both environments use the same business logic:

- `app/api/games/generate/route.ts` – article → game generation.
- `app/api/games/chat`, `.../start`, `.../my-games`, `.../[slug]/visibility`, `.../[slug]/delete`, `.../mint` – gameplay, library, visibility, deletion, and NFT minting flows.
- `app/api/payments/initiate` and `.../verify` – shared payment initiation/verification for all environments.
- `app/api/user/balance` – on-chain ERC-20 balance reads via `viem`.
- Asset Marketplace endpoints (Phase 6): `app/api/assets/generate`, `.../[id]`, `.../build-game`, `.../[id]/register`, etc., scoped to the `assets` domain.

All of these endpoints delegate to domain services in `domains/*` rather than implementing business logic inline.

### Domain layer (`domains/`)

The `domains` directory contains the core business logic, separated from UI concerns.

- `domains/games/`
  - Services such as `game-ai.service.ts`, `game-database.service.ts`, and `image-generation.service.ts` encapsulate AI orchestration, persistence, and media generation.
  - Types (e.g. game definitions, requests/responses) live in `domains/games/types.ts` and are reused across API handlers and UI.
  - Games know about their originating article, writer coin, difficulty, NFT minting state, and associated payments.

- `domains/assets/`
  - Newer domain for the Asset Marketplace.
  - Provides services for asset CRUD, marketplace discovery, Story Protocol integration, and composing games from assets.
  - Closely mirrors the games domain but remains **parallel**, not nested, to avoid circular dependencies.

- `domains/payments/`
  - Centralizes payment configuration and pricing logic (e.g. `PaymentCostService`).
  - All payment endpoints and flows (both web and Mini App) should go through this layer so that pricing and revenue splits stay consistent.

- `domains/content/`
  - Content-processing utilities (e.g. `ContentProcessorService`) for fetching and cleaning Paragraph/other article content before game or asset generation.

- `domains/users/`
  - User-facing domain (Farcaster profile resolution, user menus, attribution components) built on top of the underlying `User` Prisma model.

### Shared infrastructure (`lib/`)

Key shared infrastructure lives under `lib/`:

- `lib/wallet/`
  - Runtime wallet abstraction layer with a `WalletProvider` interface and implementations for:
    - Farcaster Mini App wallet (Farcaster environment)
    - Browser wallets via RainbowKit/Wagmi (MetaMask, Coinbase, WalletConnect)
  - `detectWalletProvider()` returns a unified interface (`provider`, type, availability) used by payment flows and any on-chain operation.

- `lib/paragraph.ts` and `lib/paragraph-sdk.ts`
  - Integration with Paragraph.xyz for fetching article content and publication metadata.

- `lib/story-protocol.service.ts`, `lib/story-config.ts`, `lib/story-sdk-client.ts`
  - Story Protocol integration, used primarily by the Asset Marketplace and NFT attribution pipeline.

- `lib/contracts.ts`
  - Helpers for interacting with on-chain contracts (WriterCoinPayment, GameNFT) via `viem`.

- `lib/error-handler.ts`, `lib/utils.ts`, `lib/animations.ts`, etc.
  - Centralized utilities for error handling, UI behavior, and misc helpers referenced throughout the app.

### Database and persistence (`prisma/`)

- `prisma/schema.prisma` defines all persisted models (User, Game, Session, Chat, Article, Order, Payment, ContentSource, ProcessedArticle, and the Asset Marketplace models such as Asset/GameFromAsset/AssetRevenue).
- The schema is Postgres-specific (`provider = "postgresql"`, `DATABASE_URL` env var) and is the single source of truth for the database shape.
- writersarcade uses Prisma's client (`lib/prisma.ts` / `lib/database.ts`) to access the database across domain services and API routes.
- Payments and NFT minting are fully tracked in the database (including token IDs, transaction hashes, and verification timestamps) so backend and UI can rely on DB state instead of the chain for normal reads.

### Smart contracts (`contracts/`)

- `WriterCoinPayment.sol` – handles payments for game generation and NFT minting in specific writer coins (e.g. $AVC) with on-chain revenue distribution.
- `GameNFT.sol` – ERC-721 contract that mints NFTs representing generated games, embedding key metadata (article URL, creator, writer coin, genre, difficulty, timestamps).
- Contract addresses and chain configuration (Base mainnet) are wired via environment variables and `lib/contracts.ts`.

---

## Key project-specific guidelines

These guidelines are embedded in the project documentation (`docs/consolidated_architecture.md`, `docs/consolidated_development.md`) and are important when modifying or extending the codebase:

- Prefer **enhancing existing services and components** (e.g. `GameAIService`, `ImageGenerationService`, `ContentProcessorService`) over introducing parallel copies for similar behavior.
- Keep **payments and wallet behavior centralized**:
  - Use the wallet abstraction in `lib/wallet/` instead of talking directly to specific wallets from components.
  - Use `domains/payments` for all cost/revenue logic and payment endpoint behavior.
- Maintain the separation between **Quick Games** (existing game flow under `domains/games` and `app/games`) and the **Asset Marketplace** (under `domains/assets` and `app/assets`), while sharing infrastructure where it’s already centralized.
- For the Mini App, always ensure `sdk.actions.ready()` (via `readyMiniApp()`) is called once the UI is ready, and use the Farcaster SDK helpers from `lib/farcaster.ts` instead of re-implementing protocol calls.
- When introducing new database fields or models, prefer extending the existing Prisma schema in `prisma/schema.prisma` and using the established migration workflow (Prisma + `npm run db:*` scripts).

For more detailed design and implementation notes, consult:

- `README.md` – product overview, core flow, and high-level tech stack.
- `docs/consolidated_architecture.md` – unified architecture, domain layout, database intent, contract roles.
- `docs/consolidated_development.md` – detailed development guide, environment configuration, endpoint behavior, and known issues.
- `docs/consolidated_roadmap.md` – roadmap, phase breakdown, and how the Asset Marketplace fits alongside the Quick Games MVP.
