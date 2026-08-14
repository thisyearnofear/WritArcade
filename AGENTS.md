# WritersArcade — Agent Operating Guide

Operational guidance for AI agents (and humans) working in this repository. These
rules prevent silent data loss or unintended live changes. Follow them **before**
mutating anything that reaches production.

## Repo layout (deploy topology — know where your change ships)

This is a **monorepo with two deploy surfaces and one database**:

- **Next.js app (repo root)** — the main product: all `app/`, `domains/`, `lib/`,
  `components/` and `prisma/schema.prisma`. Deploys to **Vercel** (project
  `writersarcade`, git-integration autodeploy on push to `main`).
- **`apps/writersarcade-api/`** — a separate **Fastify backend**, deployed to the
  VPS (`snel-bot`) via `npm run deploy:api`.
- **Production Postgres — Neon** (`DATABASE_URL` from the Vercel project env).
  This is the app database. The VPS's local Postgres is **not** WritersArcade's DB.

> Before assuming where a change deploys, confirm which surface owns the code. Do
> **not** run `deploy:api` for Next.js `app/` changes (that ships the Fastify backend).

## 🗄️ CREDITS & user data are Postgres-persistent — treat the DB as the source of truth

- `User.credits`, `totalCreditsPurchased`, and every `CreditTransaction` / `Payment`
  row live in **Neon Postgres**, never in app memory. The client always reads the
  balance from the DB via `/api/ramp/credits` — there is **no in-memory cache** of
  balances, so redeploys / restarts / cold-starts preserve credit balances.
- **Deploys do not reset or wipe credits.** Normal redeploys only replace code.
- **Warnings:**
  - **Make all schema migrations additive.** Add columns with a `@default`, never
    drop/retype existing `users` columns (`credits`, `totalCreditsPurchased`).
  - Never `prisma db push --accept-data-loss`, wipe tables, or run destructive SQL
    against the Neon DB. If you must change credit data, add a new column / write a
    careful `tsx` migration script and review it.
  - **`video-montage` and `video-upsell` debit credits directly** in their routes
    (same atomic `updateMany` pattern as `/api/credits/spend`). Only spend actions
    may go through `/api/credits/spend`; the spend zod enum is the whitelist.
  - `CreditTransaction` with `creditAmount < 0` = spend; `> 0` = purchase. Refunds
    are idempotency-gated (see `video-charge.service.ts`).

## 🔀 Git push identity (multi-account conflict)

This machine's GitHub keyring holds multiple accounts (`sneldao`, `udirobert`,
`thisyearnofear`). Only **`thisyearnofear`** can push to
`thisyearnofear/writersarcade`. If a push 403s, force the `gh` credential helper:

```bash
gh auth switch --user thisyearnofear
git -c credential.helper="!gh auth git-credential" push origin main
```

## 📈 Credit economics (current pricing, margins)

Peg: **1 credit = $0.10**. `CREDITS_CONFIG.cost` (in `lib/writer-coins.ts`) is the
single source of spend prices:

| Action | Credits | Revenue |
|---|---|---|
| `generate-game` | 10 | $1.00 |
| `mint-nft` | 5 | $0.50 |
| `play-wordle` | 1 | $0.10 |
| `video-upsell` (hero) | 50 | $5.00 |
| `video-montage` (whole comic) | 100 | $10.00 |

Margins are strong (≥70%, mostly 85–99%). Update prices in `CREDITS_CONFIG` (plus
the `cost` map, `videoUpsellCost`/`videoMontageCost` bigints, and the spend zod enum
in `/api/credits/spend`) — they must stay in sync.

## 🚀 Deploy workflow (Vercel autodeploy)

1. Make changes, add to `prisma/migrations/` (additive), review locally:
   `pnpm install` → `pnpm type-check` → `pnpm test` → `npx eslint`.
2. Commit and push to `main` (`gh` helper above). Vercel autodeploys the web app.
3. For schema changes, run migrations against **Neon** (only if Vercel's build
   doesn't auto-apply them): pull env, then
   `DATABASE_URL="$(...)" pnpm exec prisma migrate deploy`, **not** the VPS DB.
4. Verify: `curl https://writersarcade.vercel.app` returns 200 and new API routes
   respond (unauth routes should 401, not 404).