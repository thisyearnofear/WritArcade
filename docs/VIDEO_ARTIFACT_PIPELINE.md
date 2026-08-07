# Video Artifact Pipeline

## Product contract

Animation is an optional post-completion upgrade. The launch path creates one **hero ending reveal** from the final comic panel rather than rendering every panel up front.

The intended sequence is:

1. Finish the five-panel story.
2. Offer **Animate ending** as an optional 50-credit action.
3. Generate one muted, vertical, 5-second hero clip.
4. Show the clip in the cinematic view and include it in the canonical share payload.
5. Keep the existing per-panel video fields available for a later full montage product.

The shared artifact should communicate the user's ending and invite the recipient to make their own version.

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
- Immediate provider rejection refunds the 50-credit charge.
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

## Future full montage

A full five-panel montage should be a separate product tier. It should be queued with bounded concurrency, use permanent storage, and charge based on successful outputs. It should not replace the hero-ending path or block the first shareable result.
