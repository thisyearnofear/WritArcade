# WritersArcade API

Long-lived Fastify backend for WritersArcade endpoints that benefit from persistent process state:
- `/api/user/balance`
- `/api/generate-image`
- `/api/generate-audio`
- `/api/health`

## Why this exists
This app is the canonical home for infra-sensitive APIs that benefit from:
- persistent in-memory caches
- provider health tracking
- in-flight deduplication
- avoiding serverless cold starts/timeouts

## Run locally
```bash
npm install
npm run dev
```

## Deploy
The backend deploys separately from the Next/Vercel app. Use the release-artifact
script from the repo root:

```bash
npm run deploy:api -- --dry-run
npm run deploy:api -- --migrate-pm2
```

After the first migration, normal deploys are:

```bash
npm run deploy:api
```

The script uploads a local artifact to:

```text
/opt/writersarcade-api/releases/<git-sha>
```

and flips:

```text
/opt/writersarcade-api/current -> releases/<git-sha>
```

PM2 runs with `ecosystem.release.config.cjs`, using:

```text
cwd: /opt/writersarcade-api/current
logs: /opt/writersarcade-api/shared/logs
env: /opt/writersarcade-api/shared/.env
```

By default the script installs production dependencies inside a Linux Docker
container (`node:22-bookworm-slim`) before rsyncing. Use `--no-docker` only when
you are sure the local environment matches the server.

Useful overrides:

```bash
HOST=snel-bot npm run deploy:api
npm run deploy:api -- --keep 5
npm run deploy:api -- --no-docker
```

## Env
Server env lives at `/opt/writersarcade-api/shared/.env`. The deploy script will
copy the legacy env file there on first migration if it does not already exist.
