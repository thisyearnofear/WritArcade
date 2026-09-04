# Flynn — iMessage Agent

A Spectrum-based iMessage agent that turns a link to prose into a playable story.

## What it does

Text a Paragraph.xyz article, essay, or post to **Flynn**. Flynn reads it, runs the same game-generation pipeline as the WritersArcade studio, and replies with a rich link to the playable game.

The agent is built for **smoothness, utility, and shareability**:

- The reply is a real, playable WritersArcade game with its own URL and Open Graph card.
- The writer can add a free-form mood: *"make it a fable,"* *"keep it close to the text,"* or *"let it be strange."*
- iMessage-native touches (tapback + bubble/screen effects) signal that something has happened without feeling gimmicky.

## Flow

1. User sends a link to Flynn in iMessage.
2. Flynn sends an `emphasis` tapback and a gentle *"Flynn is reading this now"* bubble effect.
3. Flynn calls `POST /api/imessage/generate` with the URL and optional tone.
4. The internal API extracts the article, builds a generation prompt, runs `GameAIService`, and saves a new `Game` through `GameDatabaseService`.
5. A cover image is generated in the background via `ImageGenerationService`.
6. Flynn sends the title with a `spotlight` effect, followed by a `richlink` to the game.

## Code

- `apps/imessage-agent/src/index.ts` — Spectrum agent loop, message parsing, and reply choreography.
- `app/api/imessage/generate/route.ts` — internal, auth-guarded endpoint that reuses the studio game pipeline.
- `.env.example` and `apps/imessage-agent/.env.example` — required environment variables.

## Setup

Add to the root `.env.local`:

```bash
IMESSAGE_API_SECRET="change-me-to-a-long-random-string"
```

Copy `apps/imessage-agent/.env.example` to `apps/imessage-agent/.env` and fill in the same secret:

```bash
IMESSAGE_API_SECRET="change-me-to-a-long-random-string"
WRITERSARCADE_API_URL="http://localhost:3000"

# Optional: cloud iMessage provider from Photon. Leave unset for local Mac Messages.
SPECTRUM_PROJECT_ID=""
SPECTRUM_PROJECT_SECRET=""

# Optional: enable the terminal provider for local testing.
ENABLE_TERMINAL="true"
LOCAL_IMESSAGE="true"
```

## Run

Start the web app:

```bash
pnpm dev
```

In another terminal, run the agent in terminal-only test mode:

```bash
cd apps/imessage-agent
LOCAL_IMESSAGE=false ENABLE_TERMINAL=true bun run src/index.ts
```

For real iMessage, use a Photon cloud line or the local Mac Messages provider:

```bash
# Cloud iMessage (required for message effects)
SPECTRUM_PROJECT_ID=... SPECTRUM_PROJECT_SECRET=... bun run src/index.ts

# Local Mac iMessage (no screen/bubble effects)
LOCAL_IMESSAGE=true ENABLE_TERMINAL=false bun run src/index.ts
```

## Notes

- iMessage bubble and screen effects require the **cloud** `@spectrum-ts/imessage` provider. The local provider accepts the same API but no-ops effect sends.
- Content extraction currently supports Paragraph URLs via `ContentProcessorService`.
- `IMESSAGE_API_SECRET` is shared between the agent and the internal generate route. It must be kept private.
- This is the submission for the Photon iMessage agent hackathon.
