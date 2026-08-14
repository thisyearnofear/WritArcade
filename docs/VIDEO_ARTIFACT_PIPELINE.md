# Video Artifact Pipeline

## Product contract

Animation is an optional post-completion upgrade. The launch path creates one **hero ending reveal** from the final comic panel rather than rendering every panel up front.

The intended sequence is:

1. Finish the five-panel story.
2. **Stage 1 — Preview the look (free).** For any panel, lock one type-free “real scene” still as that panel’s image-to-video first frame, instead of feeding the comic page itself. Idempotent, rate-limited, no charge. `POST /api/games/[slug]/video/preview` with `{ panelIndex }` (defaults to the hero/ending panel).
3. **Stage 2 — Check the motion (free).** For any panel, render a short 3-second single-camera draft from the SAME locked still so the writer sees exactly how the final should move before paying anything. Idempotent, concurrency-guarded, rate-limited, no charge. `POST /api/games/[slug]/video/draft` with `{ panelIndex }` (defaults to the hero). Panels already validated show their draft clip in the showcase, so the montage grows on screen panel by panel.
4. **Stage 3 — Animate the whole comic (paid, 100 credits).** Once at least one panel’s look is locked, pay one charge and render the final clip for every panel in a single, sequential (non-fan-out) pass — no burst of parallel jobs. Mirrors the hero upsell’s atomic debit + total-failure refund semantics. `POST /api/games/[slug]/video/montage`. The whole-comic action and the single-hero upsell share one reservation per game, so they are mutually exclusive.
5. Show the resulting clips in the cinematic view (caption composited over the type-free frame at display time) and include them in the canonical share payload.

The shared artifact should communicate the user's ending and invite the recipient to make their own version.

## Storyboard-first pre-production (2026 playbook)

The durable lesson from the image-to-video playbook is **storyboard-first**:

- **Do not animate the comic page.** Feeding a comic panel to I2V makes the model "film a comic." Instead generate one photorealistic still that locks the object, lighting, and color grade (`video-hero-still.service.ts` → `generateHeroStill`), phrased as a first-frame reference.
- The **still is the through-line**: same object, same night, same grade → landing, OG, Stats, share PNG. Type (Instrument Serif / DM Mono) is **banned in the model** and composited over the frame afterward, so the look survives a model swap.
- **Motion prompts are short** (5–12 words, ONE camera move, one mood — e.g. `slow push-in. Keep the first frame identical.`). We never re-describe the scene; re-describing makes the model redesign the image.
- A **3×3 shot grid** (`generateShotGrid`) is available as visual DNA for the later full-montage tier — one timeline grid instead of N disconnected frames. It is intentionally **not** generated in the single-hero path (that would spend credits on a grid the single-clip providers do not consume).

Pre-production is gated by `VIDEO_PRE_PRODUCTION_STILL` (default on). If the locked-still generation fails, the route falls back to the original comic panel so the flow, cost, and refund semantics are unchanged.

## Phase 2 — persisted locked still, native companion clip, video OG card

Migrated by `prisma/migrations/202608140001_video_phase2_still_companion` (additive columns on `game_artifact_panels`).

- **Persisted still (`videoStillUrl`).** The locked pre-production still is durable-persisted at animate time. It is the master frame / through-line object reused by the companion wide clip and available as a future share/OG thumbnail.
- **Companion native clip (`videoCompanionUrl` + status/job columns).** A best-effort `POST /api/games/[slug]/video/companion` generates the **16:9 wide** version of the vertical 9:16 hero from the *same* still. It is included in the already-paid 50-credit upsell (no extra charge), idempotent (returns the existing wide clip), concurrency-guarded, and never overwrites the primary hero clip's URL/status. The status route polls it independently and recovers a stale sentinel reservation after 15 minutes. Failure of the companion never affects the primary artifact.
- **`og:video` / `twitter:player`.** When a completed hero clip exists, the game page's `generateMetadata` exposes it as a video embed (`openGraph.videos`, `twitter:card = player`) so a shared link plays in-app instead of degrading to a static card. The hero remain native ratio (9:16, 1080×1920) — never crop a wide clip for Stories, the object gets cut.

## Validation-first credit model ("see it, then commit")

Stills are cheap and video is where credits die, so the upsell is staged to let the writer validate before the big spend:

- **Stage 1 — Preview & lock the look (FREE).** `POST /api/games/[slug]/video/preview` generates + persists the locked, type-free master frame (`videoStillUrl`) with **no credit charge**. Idempotent; rate-limited (`video-preview:<userId>`). The animate modal surfaces this as "Step 1 · Lock the look (free)" before offering the paid reveal.
- **Stage 2 — Motion draft (FREE, short).** `POST /api/games/[slug]/video/draft` generates a 3-second, single-move clip from the *same* locked still (requires `videoStillUrl`). It is free to the writer and rate-limited (`video-draft:<userId>`) — because provider pricing is per-second, the 3s draft is genuinely cheaper than the 5s final, and making it free means no credit ledger change and no "charged twice": the 50-credit final is the only paid step. Mirrors the companion-clip async columns/polling; failure never affects the final.
- **Stage 3 — Final reveal.** The existing 50-credit 5s, native-ratio, 720p hero clip. Reuses the locked still (never regenerates it) so every artifact — draft, final, wide — shares one master.

Design guardrails from the playbook: drafts must be native-ratio, single-move, retry- and rate-capped, and free (so the writer is never charged twice); the whole package is bounded so the ceiling stays ~$3–8 of platform spend.

## Provider order

The server selects providers in this order unless `VIDEO_PROVIDER` is set:

1. Runware (`RUNWARE_API_KEY`) — preferred unified image-to-video backend.
2. Luma (`LUMA_API_KEY`).
3. fal.ai (`FAL_KEY` or `FAL_API_KEY`).
4. Replicate (`REPLICATE_API_TOKEN`).
5. Mock provider in development/no-key environments.

Provider names are server-side implementation details. Users choose a motion style, not an infrastructure vendor.

Runware uses asynchronous `videoInference` tasks and `getResponse` polling. The request sends `frameImages` at the task level. Its hosted URL is temporary by default, so production must copy completed output to permanent storage before treating it as a durable public artifact. The launch path fails closed and refunds if durable media persistence is unavailable (including missing or failed Pinata binary upload); metadata-only Grove fallback is not sufficient for video bytes. See:

- https://runware.ai/docs/platform/task-polling
- https://runware.ai/docs/platform/webhooks
- https://runware.ai/docs/models/klingai-video-3-0-standard

## Launch limits

- Five panels per standard story.
- One active animation job per user/game.
- One hero clip per completed game at launch.
- Five seconds by default; never exceed eight seconds through the public path.
- Vertical 9:16 presentation for social sharing.
- 720p-class output initially.
- Two animation starts per user per minute, with a single active job.
- Immediate provider rejection refunds the 50-credit hero charge, and the 100-credit whole-comic charge is refunded only if NO panel produces a completed clip (total failure; partial success is non-refunded).
- Provider retry is server-side and does not charge the user again.

## Reliability requirements

- Use idempotent start behavior so refreshes do not create duplicate jobs.
- Retry transient provider errors only; do not retry malformed prompts or rejected content.
- Keep upstream concurrency bounded. Do not fan out five video jobs from the launch CTA.
- Prefer webhooks for long-running production jobs. Client polling should query WritersArcade state, not multiply provider polling traffic; the server-side poll lease is 25 seconds and the first status read can poll immediately.
- Persist provider job ID, provider, model, status, error, and permanent media URL.
- Bound upstream provider requests to 20 seconds; retry only network, timeout, 408, 425, 429, and 5xx poll failures.
- Deduplicate webhook deliveries by provider task UUID.
- Refund or compensate failed jobs according to the credit ledger policy.
- Status reads recover a charged terminal failure if the originating request crashed before refunding.
- A pending reservation with no provider job is reclaimed after 15 minutes; a missing payment row releases it without minting credits.
- Retries cannot overwrite an unreconciled prior charge.

## Deployment checklist

Before enabling the feature in production:

1. Configure `FEATURE_VIDEO_PIPELINE=true` and `NEXT_PUBLIC_FEATURE_VIDEO_PIPELINE=true`, plus `RUNWARE_API_KEY` (or a fallback provider) and `PINATA_JWT`. The public flag controls only whether the browser shows the CTA; all provider keys remain server-side.
2. Confirm `RUNWARE_VIDEO_MODEL` is valid for the selected Runware account/model catalog; keep provider selection server-side.
3. Apply migrations in order with `pnpm prisma migrate deploy` and verify the generated Prisma client.
4. Generate one staging hero clip and confirm the stored URL is durable rather than a Runware/Luma/fal/Replicate URL.
5. Exercise immediate provider rejection, delayed provider failure, insufficient credits, duplicate start requests, and a stale reservation; verify refunds are recorded once.
6. Verify OG/social preview behavior from the canonical game page before treating the MP4 URL as a viral acquisition surface.
7. Add webhook/background reconciliation before high-volume launch; current stale-charge recovery is request-driven through the status route.

## Analytics

The pipeline emits:

- `animation_started`
- `animation_completed`
- `animation_failed`
- `share_clicked` with `mode=hero-video` when applicable
- `hero_artifact_shared` when a completed hero URL is shared through the existing share surface
- `share_referral_started` when an attributed recipient starts a creation flow (reserved for the referral landing implementation)

The key growth metric is not animation completion alone. Measure:

`animation started → hero artifact shared → attributed landing visit → creation started → story completed`

## Whole-comic montage (Stage 3) — shipped

The all-panel montage is now implemented as the paid 100-credit tier (`POST /api/games/[slug]/video/montage`, `'video-montage'` in `CREDITS_CONFIG.cost`). Design decisions:

- **Sequential, bounded:** panels render one at a time in `panelIndex` order — no 5-way fan-out, so upstream concurrency stays bounded (per the reliability contract).
- **Idempotent per panel:** panels with an existing final `videoUrl` are skipped; a `pending` guard prevents a retry from starting a second job on the same panel.
- **Charging:** atomic debit + `payment` row (`action:'video-montage'`) mirror the hero upsell. Refunded on **total failure** only.
- **Still first:** each panel reuses its locked still (`videoStillUrl`) when present, otherwise best-effort produces one; falling back to the frozen comic panel keeps flow/cost/refund semantics unchanged.
- **Reservation:** shares the single-per-game video reservation with the hero upsell, so hero + montage are mutually exclusive. The `video-montage` payment action is a plain `String`, so no schema migration is required for this tier.

### Deferred visuals (not in this change)

- Per-panel "Preview the look" / "Check the motion" **buttons** in the comic grid/single-panel views still need `panelIndex` threaded into `ComicBookFinalePanelData` plus a small per-panel control strip — mechanical JSX, kept out of the core pipeline change.
- A grid-based shot timeline (`generateShotGrid`) remains available as future visual DNA for a premium montage, but is intentionally not generated in the hero or current montage paths.
