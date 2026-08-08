#!/usr/bin/env bash
# Install the Daily Challenge systemd timer on the VPS (primary scheduler).
#
# Usage:
#   CRON_SECRET=... ./scripts/cron/install-daily-challenge-cron.sh
#   HOST=snel-bot APP_URL=https://writersarcade.vercel.app ./scripts/cron/install-daily-challenge-cron.sh
#   ./scripts/cron/install-daily-challenge-cron.sh --dry-run

set -euo pipefail

HOST="${HOST:-snel-bot}"
REMOTE_ROOT="${REMOTE_ROOT:-/opt/writersarcade-api/cron}"
APP_URL="${APP_URL:-https://writersarcade.vercel.app}"
DRY_RUN=0

usage() {
  cat <<EOF
Usage: $0 [options]

Installs scripts/cron/cron-daily-challenge.sh + systemd timer on the VPS.
Primary Daily Challenge scheduler (shuffle + featured auto-pick).

Options:
  --host <host>         SSH host. Default: ${HOST}
  --remote-root <path>  Install root. Default: ${REMOTE_ROOT}
  --app-url <url>       Next.js production URL. Default: ${APP_URL}
  --dry-run             Print actions without changing the remote host
  -h, --help            Show help

Requires:
  CRON_SECRET in the environment (written to ${REMOTE_ROOT}/daily-challenge.env on the host)
  Passwordless sudo on the host for systemd unit install
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --remote-root) REMOTE_ROOT="$2"; shift 2 ;;
    --app-url) APP_URL="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET must be set in the environment before install." >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRIPT_SRC="${REPO_ROOT}/scripts/cron/cron-daily-challenge.sh"
SERVICE_SRC="${REPO_ROOT}/scripts/systemd/writersarcade-daily-challenge.service"
TIMER_SRC="${REPO_ROOT}/scripts/systemd/writersarcade-daily-challenge.timer"

for f in "${SCRIPT_SRC}" "${SERVICE_SRC}" "${TIMER_SRC}"; do
  if [[ ! -f "${f}" ]]; then
    echo "Missing ${f}" >&2
    exit 1
  fi
done

echo "Installing Daily Challenge cron on ${HOST}"
echo "  remote root: ${REMOTE_ROOT}"
echo "  app url:     ${APP_URL}"

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "DRY RUN — would copy script + units and enable writersarcade-daily-challenge.timer"
  exit 0
fi

ssh "${HOST}" "mkdir -p '${REMOTE_ROOT}'"

# Env file (secret stays on the host; not committed)
# shellcheck disable=SC2029
ssh "${HOST}" "umask 077; cat > '${REMOTE_ROOT}/daily-challenge.env' <<EOF
# writersarcade Daily Challenge VPS cron
APP_URL=${APP_URL}
CRON_SECRET=${CRON_SECRET}
EOF
chmod 600 '${REMOTE_ROOT}/daily-challenge.env'"

scp "${SCRIPT_SRC}" "${HOST}:${REMOTE_ROOT}/cron-daily-challenge.sh"
ssh "${HOST}" "chmod 755 '${REMOTE_ROOT}/cron-daily-challenge.sh'"

# Rewrite unit paths if remote root differs from the checked-in defaults
TMP_SERVICE="$(mktemp)"
TMP_TIMER="$(mktemp)"
trap 'rm -f "${TMP_SERVICE}" "${TMP_TIMER}"' EXIT
sed "s|/opt/writersarcade-api/cron|${REMOTE_ROOT}|g" "${SERVICE_SRC}" > "${TMP_SERVICE}"
cp "${TIMER_SRC}" "${TMP_TIMER}"

scp "${TMP_SERVICE}" "${HOST}:/tmp/writersarcade-daily-challenge.service"
scp "${TMP_TIMER}" "${HOST}:/tmp/writersarcade-daily-challenge.timer"

ssh "${HOST}" "set -euo pipefail
  sudo mv /tmp/writersarcade-daily-challenge.service /etc/systemd/system/writersarcade-daily-challenge.service
  sudo mv /tmp/writersarcade-daily-challenge.timer /etc/systemd/system/writersarcade-daily-challenge.timer
  sudo systemctl daemon-reload
  sudo systemctl enable --now writersarcade-daily-challenge.timer
  sudo systemctl status writersarcade-daily-challenge.timer --no-pager || true
  echo '--- next trigger ---'
  sudo systemctl list-timers writersarcade-daily-challenge.timer --no-pager
"

echo
echo "Installed. Manual run:"
echo "  ssh ${HOST} sudo systemctl start writersarcade-daily-challenge.service"
echo "Force featured re-pick:"
echo "  ssh ${HOST} 'FORCE_FEATURED=true ${REMOTE_ROOT}/cron-daily-challenge.sh'"
