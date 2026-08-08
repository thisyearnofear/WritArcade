# writersarcade × BasePaint

**writersarcade** turns writing into playable games. **Daily Challenge** is the shared daily ritual inside that product. **[BasePaint](https://basepaint.xyz)** supplies today’s collaborative canvas — the shared *world* — while a featured article supplies the *plot*. **Inco** still deals each player a unique encrypted modifier hand on Base.

Product nesting:

```
writersarcade                 ← brand / product
├── Create                    ← article first; optional “style with today’s BasePaint”
├── Play                      ← arcade of games
└── Daily Challenge           ← same dual source for everyone today
    ├── article               ← plot, voice, themes (writer)
    ├── BasePaint             ← world, palette, canvas (community)
    └── Inco                  ← encrypted 5-card modifier hand (unchanged mechanic)
```

- **Daily Challenge:** [`/basepaint`](https://writersarcade.vercel.app/basepaint) (`/daily` redirects here)
- **Day archive:** `/basepaint/day/[n]`
- **Collection:** `/basepaint/collection` (owned BasePaint canvases → community stories)

See also [FEATURES.md](./FEATURES.md) — Daily Challenge section.

## Dual-source Daily (target model)

**Pitch:** A featured writer’s article, staged inside today’s BasePaint canvas — same world, your secret hand.

| Layer | Role |
|-------|------|
| **Article** | Plot, voice, characters, themes |
| **BasePaint** | Visual world, theme word, palette, canvas description |
| **Inco** | Fair uniqueness — encrypted deck, hand, scoring, reveal |

```
Shared dual source (same for everyone today)
  ├── Article  → plot, voice, themes (writer)
  └── BasePaint → world, palette, visuals (canvas)
         ↓
Inco Daily Challenge (unchanged)
  ├── Encrypted 52-card modifier deck
  ├── Your 5-card hand
  ├── Hidden constraints per panel
  ├── Encrypted scoring
  └── Reveal + leaderboard
```

**Fallback:** If no featured article is configured, Daily uses BasePaint-only (current behavior) until dual is fully wired in production.

**Create:** Optional “Stage in today’s BasePaint” toggle on `/generate` — article stays the plot; today’s canvas supplies world/palette. Still writer-first; not a second brand.

## Architecture

```
Featured article URL (env / curator)
        +
BasePaint GraphQL + REST APIs
        ↓
lib/basepaint/          ← BasePaint I/O + dual prompt assembly
        ↓
/api/basepaint/*        ← day archive, strokes, collection
/api/daily-challenge/*  ← challenge lifecycle (Inco vault)
        ↓
DailyChallengeView      ← writersarcade Header + Daily subnav
        ↓
Game generation         ← dual prompt; articleUrl tags canvas + article
        ↓
Gameplay                ← split view when canvas-linked; dual attribution
```

## `lib/basepaint/` modules

| Module | Responsibility |
|--------|----------------|
| `day.ts` | Official day index (epoch `1691599315`) |
| `urls.ts` | Canvas image, timelapse, mint links with `?referrer=` |
| `theme.ts` | REST `/api/theme/{day}` |
| `graphql.ts` | Canvas stats, contributors, strokes, owned balances |
| `strokes.ts` | Decode on-chain `Stroke.data` (x, y, palette index) |
| `vision.ts` | Vision model describes canvas content for prompts |
| `prompt.ts` | BasePaint-only + dual-source story prompt builders |
| `source.ts` | Daily source assembly (BasePaint-only + dual) |
| `featured-auto.ts` | Paragraph allowlist rotation + `ensureTodaysFeaturedArticle` |
| `source-url.ts` | `basepaint://day/N` (+ optional `?article=`) tagging |
| `games.ts` | Prisma queries for community stories per day |

## External APIs used

| API | Use |
|-----|-----|
| `GET basepaint.xyz/api/theme/{day}` | Theme, palette, size |
| `GET basepaint.xyz/api/art/image?day=N` | Canvas PNG |
| `GET basepaint.net/animations/{dddd}.mp4` | Timelapse |
| `POST graphql.basepaint.xyz` | Stats, contributors, strokes, balances |
| `GET basepaint.xyz/api/track.gif?ref=writersarcade` | Optional traffic pixel |

## On-chain stack (writersarcade)

- **DailyChallengeVault** on Base — encrypted 52-card modifier deck per day
- **Inco Lightning** — `attestedDecrypt` for modifier/score reveal at finale
- Players connect on Base only to deal cards and submit scores

Inco is independent of whether the seed is BasePaint-only or article + BasePaint. Dual source upgrades *what* everyone plays; Inco still defines *how* each run is fair and unique.

## Environment

```bash
NEXT_PUBLIC_DAILY_CHALLENGE_VAULT_ADDRESS="0x..."
NEXT_PUBLIC_BASEPAINT_REFERRER_ADDRESS="0x..."   # mint referral
FEATURE_DAILY_CHALLENGE="true"
NEXT_PUBLIC_FEATURE_DAILY_CHALLENGE="true"
CRON_SECRET="..."                                 # setup + featured ops

# Dual-source — env is bootstrap/fallback only (DB row from auto-pick or API wins)
DAILY_CHALLENGE_FEATURED_ARTICLE_URL="https://paragraph.com/@..."
DAILY_CHALLENGE_FEATURED_ARTICLE_TITLE="Essay title"

# Paragraph auto-pick (default on)
DAILY_CHALLENGE_AUTO_FEATURED="true"
# Comma-separated slugs without @; empty = WRITER_COINS.paragraphAuthor
DAILY_CHALLENGE_FEATURED_PUBLICATIONS=""
DAILY_CHALLENGE_FEATURED_LOOKBACK_DAYS="14"
```

## Featured article (Paragraph auto + ops)

Dual Daily resolves featured article in order: **DB row → env bootstrap → BasePaint-only**.

### Auto-pick (default)

Implemented in `lib/basepaint/featured-auto.ts`. Schedulers call `POST /api/daily-challenge/setup` (also lazy on Daily page load):

1. Rotate through the Paragraph allowlist (writer-coin `paragraphAuthor` slugs, or `DAILY_CHALLENGE_FEATURED_PUBLICATIONS`)
2. Fetch recent posts via `@paragraph_xyz/sdk` for that publication
3. Skip URLs featured in the last `DAILY_CHALLENGE_FEATURED_LOOKBACK_DAYS` (default 14)
4. Upsert today’s dual `DailyChallenge` row (title/author cached)

Does **not** overwrite an existing dual row for the day (manual override wins).

### Scheduler (VPS primary)

Vercel Hobby cron is unreliable (hour-granular). Primary wake-up is a **systemd timer on the VPS** that hits the Next.js setup route:

```bash
# From a machine with SSH to the VPS (default host: snel-bot)
CRON_SECRET=... pnpm cron:daily-challenge:install
# or: CRON_SECRET=... ./scripts/cron/install-daily-challenge-cron.sh
```

- Timer: `00:05 UTC` daily (`writersarcade-daily-challenge.timer`)
- Script: `/opt/writersarcade-api/cron/cron-daily-challenge.sh`
- Secrets: `/opt/writersarcade-api/cron/daily-challenge.env` (mode 600)

```bash
# Manual run on the VPS
ssh snel-bot sudo systemctl start writersarcade-daily-challenge.service

# Force featured re-pick
ssh snel-bot 'FORCE_FEATURED=true /opt/writersarcade-api/cron/cron-daily-challenge.sh'
```

Backup: GitHub Actions at 00:15 UTC. Lazy setup still runs if both miss.

```bash
curl -X POST "$APP_URL/api/daily-challenge/setup" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"forceFeatured":true}'
```

### Manual override

```bash
curl -X POST "$APP_URL/api/daily-challenge/featured" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"articleUrl":"https://paragraph.com/@writer/slug","articleTitle":"Optional title"}'
```

`GET /api/daily-challenge/featured` returns today's resolved source (public).

## Hackathon demo script (~90s)

Pitch: **writersarcade Daily — a writer’s piece inside today’s BasePaint canvas, with your secret Inco hand.**

1. Open `/basepaint` — dual source: featured article + today’s canvas
2. Toggle timelapse → final canvas; note writer + painters
3. Connect wallet → Play → on-chain card deal
4. Generate/play — split view: canvas | your panel (palette-locked)
5. Finale — modifier reveal + writer credit + contributor credits + mint CTA → leaderboard
6. `/basepaint/day/847` — archive, stroke replay, community stories
7. `/basepaint/collection` — owned canvases + linked stories

## Post-game attribution

After a canvas-linked story completes, `BasePaintFinaleAttribution` shows:

- Top contributor addresses (linked to BasePaint profiles)
- Artist/mint counts from GraphQL
- **Mint this canvas on BasePaint** (with referrer when configured)
- Link to `/basepaint/day/[n]` archive

Dual-source runs also surface the featured article / writer (plot source).

Surfaces: modifier reveal (Daily Challenge), post-game completion screen, comic finale footer.

BasePaint artwork is **CC0**. Outbound links use mint referrer when `NEXT_PUBLIC_BASEPAINT_REFERRER_ADDRESS` is set.
