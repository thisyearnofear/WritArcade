#!/usr/bin/env bash
# Trigger Daily Challenge setup on the Next.js app:
#   - Inco deck shuffle (idempotent)
#   - Paragraph featured-article auto-pick
#
# Intended as the primary scheduler on the VPS (systemd timer).
# GitHub Actions remains a backup; Vercel Hobby cron is optional/off.
#
# Env (from process env or WRITERSARCADE_CRON_ENV file):
#   CRON_SECRET  (required)
#   APP_URL      (default https://writersarcade.vercel.app)
#   FORCE_FEATURED=true  (optional re-pick)

set -euo pipefail

ENV_FILE="${WRITERSARCADE_CRON_ENV:-/opt/writersarcade-api/cron/daily-challenge.env}"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

APP_URL="${APP_URL:-https://writersarcade.vercel.app}"
APP_URL="${APP_URL%/}"

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET is required (export it or set it in ${ENV_FILE})" >&2
  exit 1
fi

BODY='{}'
if [[ "${FORCE_FEATURED:-}" == "true" ]]; then
  BODY='{"forceFeatured":true}'
fi

TMP="$(mktemp)"
trap 'rm -f "${TMP}"' EXIT

HTTP_CODE="$(
  curl -sS -o "${TMP}" -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    -d "${BODY}" \
    "${APP_URL}/api/daily-challenge/setup"
)"

echo "POST ${APP_URL}/api/daily-challenge/setup → HTTP ${HTTP_CODE}"
cat "${TMP}"
echo

if [[ "${HTTP_CODE}" -lt 200 || "${HTTP_CODE}" -ge 300 ]]; then
  exit 1
fi
