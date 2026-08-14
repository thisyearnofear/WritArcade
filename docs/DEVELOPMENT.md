# Development Guide

## Quick Start

```bash
# Use the supported runtime (Node 20.x) — pinned in .nvmrc, enforced in CI
nvm use

# Install dependencies
pnpm install
```

> **Runtime:** the project pins Node 20 (`engines` in `package.json`, `.nvmrc`, and CI).
> On other major versions pnpm prints an `Unsupported engine` warning; install
> Node 20 (e.g. `nvm install 20 && nvm use`) to avoid subtle toolchain drift.

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your API keys

# Start dev server
pnpm dev
# Web app: http://localhost:3000/
# Mini-app: http://localhost:3000/mini-app
```

## Essential Commands

### Development
```bash
pnpm dev              # Start dev server (Turbopack)
pnpm build            # Production build (Prisma client + Next.js webpack)
pnpm start            # Start production server
pnpm lint             # ESLint with auto-fix
pnpm type-check       # TypeScript type checking (no emit)
pnpm test             # Run all tests (Vitest)
pnpm test:watch       # Run tests in watch mode
```

### Database (Prisma + PostgreSQL)
```bash
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema changes (no migrations)
pnpm db:migrate       # Interactive dev migrations
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:setup         # Generate client + push schema
```

### Build Notes
- Dev uses Turbopack (`next dev --turbopack`)
- Production builds use webpack (`next build --webpack`)
- `pnpm build` uses the current Prisma client and builds with webpack. Apply committed database migrations separately with `pnpm db:deploy` before deploying; do not use `prisma db push` against production.
- If the local build hits Node heap pressure, use `NODE_OPTIONS=--max-old-space-size=8192 pnpm build`.

### CI Pipeline
A CI workflow (`.github/workflows/ci.yml`) runs on every push:
1. `pnpm type-check` - catches type errors
2. `pnpm lint` - catches code quality issues
3. `pnpm test` - runs the Vitest suite (root + `apps/writersarcade-api` HTTP tests; the API's npm deps are installed in CI first)
4. `pnpm build` - verifies production build succeeds

#### Mezo Passport build configuration
`@mezo-org/passport` and its `@mezo-org/orangekit*` dependencies were authored
for Vite/CRA (React 18). To make them work in our Next.js 16 / React 19 stack
we use three small mechanisms in `next.config.js`:

1. **`transpilePackages`** for `@mezo-org/orangekit`, `@mezo-org/orangekit-smart-account`,
   and `@mezo-org/orangekit-contracts` — those packages either ship raw `.ts`
   (`main: "index.ts"`) or deep-import sibling `.ts` files at runtime. SWC
   transpiles them like first-party source.
2. **React/`react-dom` aliasing** to `node_modules/react`/`react-dom` so the
   single React copy is used everywhere. `@mezo-org/mezo-clay` bundles its own
   vendored baseui that includes a React copy, which causes the classic
   `ReactCurrentOwner is undefined` crash unless we force a single React.
3. **`__SECRET_INTERNALS` polyfill** in `lib/react-19-internals-polyfill.ts`
   (loaded by `ClientProvidersLoader`) — React 19 removed the legacy
   internals object that baseui (inside mezo-clay) reads from. The polyfill
   shims it before mezo-clay evaluates.

Web3 providers are mounted via a `dynamic(..., { ssr: false })` boundary in
`components/providers/ClientProvidersLoader.tsx`, so the Passport graph only
runs in the browser and never touches the server prerender.

## Environment Configuration

### Required Variables
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/writarcade"
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="..."
VENICE_API_KEY="..."              # Primary image generation
MODAL_IMAGE_GEN_URL="..."         # Fallback (see docs/MODAL_SETUP.md)
```

### Optional Variables
```env
# AI Services
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-..."
NETMIND_API_KEY="..."             # Secondary image fallback

# Blockchain
BASE_RPC_URL="https://mainnet.base.org"
STORY_RPC_URL="https://aeneid.storyrpc.io"
STORY_WALLET_KEY="0x..."          # For server-side Story txs
PINATA_JWT="pina_..."             # IPFS metadata + durable hero-video bytes; required for shareable video
IPFS_GATEWAY="https://gateway.pinata.cloud"
GROVE_CHAIN_ID="8453"             # Metadata fallback only; not currently used for video bytes

# Hero video artifact pipeline (server-side only)
RUNWARE_API_KEY="..."             # Preferred image-to-video provider
RUNWARE_VIDEO_MODEL="klingai:kling-video@3-standard"
RUNWARE_VIDEO_DURATION="5"        # Clamped to 3–8 seconds
VIDEO_PROVIDER="runware"          # Optional explicit first provider
LUMA_API_KEY="..."                 # Fallback
FAL_KEY="..."                      # Fallback; FAL_API_KEY is also accepted
REPLICATE_API_TOKEN="..."          # Fallback
FEATURE_VIDEO_PIPELINE="true"     # Enable the server-side optional finale animation path
NEXT_PUBLIC_FEATURE_VIDEO_PIPELINE="true" # Also show the animation CTA in the browser
VIDEO_PRE_PRODUCTION_STILL="true" # Lock a type-free "real scene" first frame before I2V (default on)

# Mezo Hackathon
NEXT_PUBLIC_MEZO_TESTNET_RPC="https://rpc.test.mezo.org"
NEXT_PUBLIC_MEZO_PAYMENT_SPLITTER_TESTNET="0x32D0356f533cC429F94Db73f383bBb21a459E16b"
MEZO_TESTNET_MUSD_ADDRESS="0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503"

# Feature Integrations
LIT_PROTOCOL_ENABLED="true"
LIT_NETWORK="datil-dev"
HYPERCERTS_HANDLE="handle.certified.app"
HYPERCERTS_APP_PASSWORD="..."
```

See `.env.example` for full list.

## Project Structure

```
app/                    # Next.js App Router
├── api/                # API routes (shared by web + mini-app)
├── mini-app/           # Farcaster mini-app (call sdk.actions.ready())
├── games/              # Web app gameplay (+ loading.tsx / error.tsx)
├── my-games/           # User library (+ loading.tsx / error.tsx)
├── generate/           # Game generation (+ loading.tsx / error.tsx)
├── profile/            # User profile (+ loading.tsx / error.tsx)
└── writers/[coinId]/   # Writer pages (+ loading.tsx / error.tsx)

domains/                # Business logic (no UI)
├── games/              # Quick Games services
├── assets/             # Asset Marketplace services
├── payments/           # Payment processing (Strategy + Factory)
├── content/            # Article processing
└── users/              # User management

services/               # Domain-adjacent services (from lib/ split)
├── analytics.ts        # Event tracking
├── error-handler.ts    # Error formatting
├── rate-limit.ts       # API rate limiting
└── auth.ts             # Authentication

lib/                    # Cross-cutting infrastructure
├── wallet/             # Runtime wallet abstraction
├── api-response.ts     # Standardized API responses
├── request-dedup.ts    # In-flight request deduplication
├── ai-cache.ts         # AI generation caching
├── latency-monitor.ts  # P95 latency monitoring
├── story-protocol.*    # Story Protocol SDK
├── inco.ts             # Inco confidential compute (secret panels)
├── daily-challenge.ts  # Daily challenge server helpers
├── hypercerts.*        # Impact certificates
└── contracts.ts        # On-chain helpers

contracts/              # Solidity (WriterCoinPayment, GameNFT)
prisma/schema.prisma    # Database schema (single source of truth)
```

## Code Quality

```bash
pnpm lint               # ESLint 9 flat config
pnpm type-check         # TypeScript strict mode
```

**Pre-push hook**: Install with `bash scripts/install-git-hooks.sh`  
Runs `pnpm type-check` before every push. Bypass with `git push --no-verify`.

## API Endpoints

### Identity
- `POST /api/session/guest` - Provision an anonymous guest identity (idempotent)
- `POST /api/auth/email/request` - Send a magic-link email
- `GET /api/auth/email/verify` - Verify magic-link token and set `user_session` cookie
- `POST /api/auth/verify` - Verify SIWE message and set wallet session cookie; merges guest/email identity

### Games
- `POST /api/games/generate` - Generate from article URL, marketing copy, BasePaint (`contentType: 'basepaint'`), or dual (`contentType: 'dual'` = featured article + canvas)
- `POST /api/games/mint` - Mint game as NFT with WriterCoinPayment
- `GET /api/games/my-games` - List user's games
- `POST /api/games/[slug]/fund` - Link a verified payment to an unfunded game (enables minting)
- `POST /api/games/[slug]/secret-panel` - NFT-gated secret panel handle(s) for Inco decrypt
- `POST /api/games/[slug]/inco-store` - Store secret panel on-chain after mint
- `GET/POST /api/daily-challenge/start` - Today's challenge (dual from DB featured article, else env bootstrap, else BasePaint-only); lazy-shuffles deck if missing
- `GET /api/daily-challenge/featured` - Resolved dual/BasePaint source for today (public)
- `POST /api/daily-challenge/featured` - Upsert today's featured article (`CRON_SECRET` bearer); no redeploy needed
- `GET /api/daily-challenge/setup` - Setup (legacy GET); prefer POST (`CRON_SECRET`)
- `POST /api/daily-challenge/setup` - Shuffle Inco deck + auto-pick featured article; body `{ day?, forceFeatured? }` (`CRON_SECRET`)
- **VPS cron (primary):** `pnpm cron:daily-challenge:install` → systemd timer `00:05 UTC` (`scripts/cron/cron-daily-challenge.sh`)
- **GitHub Actions (backup):** `.github/workflows/daily-challenge-shuffle.yml` at 00:15 UTC
- `GET /api/basepaint/day/[day]` - Day archive (stats, games, vision description)
- `GET /api/basepaint/strokes/[day]` - On-chain stroke bundle for replay
- `GET /api/basepaint/collection?address=0x…` - Owned BasePaint canvases + linked stories
- GitHub Actions backup: `.github/workflows/daily-challenge-shuffle.yml` (repo secret `CRON_SECRET`)
- `POST /api/daily-challenge/[id]/record-choice` - Record encrypted score delta
- `POST /api/daily-challenge/[id]/reveal` - Submit leaderboard after on-chain reveal
- `POST /api/games/[slug]/start` - Start a game session; logs `started` resonance event
- `POST /api/games/[slug]/play` - Increment play counter; logs `completed` resonance event
- `POST /api/games/chat` - Process a player choice; logs `choice` resonance event
- `GET /api/games/[slug]/insights` - Owner-gated resonance analytics
- `POST /api/games/[slug]/video/start` - Charge credits and start one hero-ending animation
- `GET /api/games/[slug]/video/status` - Read/poll the hero job with provider fallback and recovery

### Credits
- `GET /api/ramp/credits` - Query current actor's credit balance
- `POST /api/ramp/order` - Create a fiat onramp order
- `POST /api/ramp/webhook` - Receive payment confirmation from Etherfuse
- `POST /api/credits/spend` - Spend credits for an action (identity from session cookie)

### Assets
- `POST /api/assets/generate` - Generate assets from article
- `POST /api/assets/save` - Save asset draft
- `GET /api/assets/marketplace` - Browse marketplace assets
- `POST /api/assets/[id]/register` - Register asset as Story Protocol IP

### Story Protocol
- `POST /api/story/register` - Client-side IP registration
- `GET /api/story/royalties` - Check royalty balances
- `POST /api/story/claim` - Claim derivative royalties

### Image Generation
- `POST /api/generate-image` - Multi-provider image generation (Venice → Modal → Netmind)

## Development Workflow

### Branching
- `main` - Production
- `feature/*` - New features
- `hotfix/*` - Emergency fixes

### Adding Database Fields
1. Edit `prisma/schema.prisma`
2. Run `pnpm db:push` (dev) or `pnpm db:migrate` (shared)
3. Update TypeScript types automatically

### Mini-App Development
- Always call `sdk.actions.ready()` via `readyMiniApp()` when UI loads
- Use `lib/farcaster.ts` helpers (don't re-implement protocol calls)
- Mini-app API routes under `app/mini-app/api/` reuse same domain services

### Image Generation Providers
The system auto-fallbacks: Venice AI → Modal → Netmind

### Hero Video Pipeline
The finale animation is intentionally a post-completion optional upgrade. It generates one short hero reveal from the final panel rather than a five-panel montage. Runware is preferred, followed by Luma, fal, and Replicate when configured. Provider names are hidden from users; they choose a motion style.

Production requirements:

- Set `PINATA_JWT` before enabling paid animation. Provider-hosted URLs are temporary; if durable upload fails, the animation is marked failed and the credit charge is refunded.
- Apply the five committed video/analytics migrations with `pnpm db:deploy` in staging/production before using the new routes. Never use `prisma migrate reset` against a shared or production database.
- Keep `FEATURE_VIDEO_PIPELINE` and provider secrets server-side. `NEXT_PUBLIC_FEATURE_VIDEO_PIPELINE` is only a client-visible UI flag; never expose provider API keys in `NEXT_PUBLIC_*` variables.
- The public path is limited to one active hero job per game, two starts per user per minute, and 3–8 second clips (5 seconds by default).
- A status read coordinates upstream polling and can reclaim stale reservations after 15 minutes. For production scale, add webhook/background reconciliation so recovery does not depend only on a user revisiting the page.

See [Video Artifact Pipeline](./VIDEO_ARTIFACT_PIPELINE.md) for the product contract, provider behavior, credit safety, analytics, and future montage plan.

**Modal setup**: See [docs/MODAL_SETUP.md](./MODAL_SETUP.md)

## Troubleshooting

### Module not found
```bash
pnpm install
# If lockfile issues: pnpm install --no-frozen-lockfile
```

### TypeScript errors
```bash
pnpm type-check          # See all errors
# Fix errors in source files (not .next/ - excluded from type checking)
```

### Database connection errors
- Verify `DATABASE_URL` in `.env.local`
- Ensure PostgreSQL is running
- Check user permissions

### Wallet connection issues
- Verify `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- Ensure user has wallet installed (MetaMask, Rainbow, etc.)

### Build failures
```bash
# Clean install
rm -rf node_modules .next
pnpm install
pnpm build
```

### Modal image generation
```bash
cd scripts/modal
modal app list                    # Check deployment
modal app logs writersarcade-image-gen  # View logs
modal deploy modal_image_gen.py   # Redeploy
```

## Testing

### Automated Tests (Vitest)

```bash
pnpm test             # Run all tests (root suite + API HTTP tests)
pnpm test:watch       # Run tests in watch mode
pnpm test:api         # Run only the Fastify API HTTP tests
npx vitest run tests/payments/  # Run payment tests only
```

Tests live in `tests/` (mirroring the `domains/` structure) plus the API:
- `tests/payments/payment-cost-service.test.ts` — 18 tests: revenue splits, caching, edge cases
- `tests/payments/strategies.test.ts` — 16 tests: WriterCoin + MUSD strategy with fake timers
- `tests/payments/initiate-route.test.ts` — 3 tests: payment initiation endpoint
- `apps/writersarcade-api/src/index.test.js` — 11 HTTP tests: health, production `start()` boot, balance/generate/audio/NFT-ownership validation (no network)

**188 tests** total. To run the API suite from its own directory: `cd apps/writersarcade-api && npm test`
(the API is an npm package outside the pnpm workspace; its deps must be installed first via `npm ci` there).

Tests use Vitest with mocked Prisma and fake timers for retry/backoff logic. Tests run automatically in CI.

### Manual Testing
1. Start dev server: `pnpm dev`
2. Test web app at `http://localhost:3000`
3. Test mini-app at `http://localhost:3000/mini-app`
4. Verify API endpoints with curl or browser dev tools

## Contributing

- Follow existing code style and patterns
- Use TypeScript strict mode
- Keep PRs focused on single features
- Update docs if changing public APIs
- Domain services > inline logic in API routes
