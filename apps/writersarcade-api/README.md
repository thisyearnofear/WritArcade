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
Recommended server path:
- `/opt/writersarcade`

Run with pm2 using `ecosystem.config.cjs`.

## Env
Copy `.env.example` to `.env` and fill in provider secrets.
