#!/usr/bin/env bash
# Deploy the long-lived WritersArcade Fastify backend as a release artifact.
#
# Default target layout:
#   /opt/writersarcade-api/
#     shared/.env
#     shared/logs/
#     releases/<git-sha>/
#     current -> releases/<git-sha>
#
# First migration from the legacy PM2 cwd should be run with --migrate-pm2.

set -euo pipefail

HOST="${HOST:-snel-bot}"
REMOTE_ROOT="${REMOTE_ROOT:-/opt/writersarcade-api}"
PM2_NAME="${PM2_NAME:-writersarcade-api}"
NODE_IMAGE="${NODE_IMAGE:-node:22-bookworm-slim}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
DRY_RUN=0
USE_DOCKER=1
SKIP_INSTALL=0
MIGRATE_PM2=0

usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  --host <host>          SSH host. Default: ${HOST}
  --remote-root <path>   Remote release root. Default: ${REMOTE_ROOT}
  --pm2-name <name>      PM2 process name. Default: ${PM2_NAME}
  --node-image <image>   Docker image for Linux npm install. Default: ${NODE_IMAGE}
  --keep <n>             Number of releases to keep. Default: ${KEEP_RELEASES}
  --no-docker            Run npm install locally instead of in Docker.
  --skip-install         Do not install node_modules into the artifact.
  --migrate-pm2          Start/repoint PM2 using the release ecosystem config.
  --dry-run              Print rsync operations without changing remote files.
  -h, --help             Show this help.

Examples:
  $0 --dry-run
  $0 --migrate-pm2
  HOST=snel-bot $0 --keep 5
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      HOST="$2"
      shift 2
      ;;
    --remote-root)
      REMOTE_ROOT="$2"
      shift 2
      ;;
    --pm2-name)
      PM2_NAME="$2"
      shift 2
      ;;
    --node-image)
      NODE_IMAGE="$2"
      shift 2
      ;;
    --keep)
      KEEP_RELEASES="$2"
      shift 2
      ;;
    --no-docker)
      USE_DOCKER=0
      shift
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    --migrate-pm2)
      MIGRATE_PM2=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required" >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
APP_DIR="${REPO_ROOT}/apps/writersarcade-api"
if [[ ! -d "${APP_DIR}/src" ]]; then
  echo "Backend app not found at ${APP_DIR}" >&2
  exit 1
fi

SHA="$(git -C "${REPO_ROOT}" rev-parse --short=12 HEAD)"
RELEASE_DIR="${REMOTE_ROOT}/releases/${SHA}"
BUILD_DIR="${TMPDIR:-/tmp}/writersarcade-api-release-${SHA}"

echo "Preparing ${PM2_NAME} release ${SHA}"
echo "Local app: ${APP_DIR}"
echo "Remote: ${HOST}:${RELEASE_DIR}"

rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

rsync -a \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'logs' \
  --exclude 'node_modules' \
  --exclude 'npm-debug.log*' \
  --exclude '.DS_Store' \
  "${APP_DIR}/" "${BUILD_DIR}/"

cp "${APP_DIR}/ecosystem.release.config.cjs" "${BUILD_DIR}/ecosystem.config.cjs"
rm -f "${BUILD_DIR}/ecosystem.release.config.cjs"

if [[ "${SKIP_INSTALL}" -eq 0 ]]; then
  if [[ "${USE_DOCKER}" -eq 1 ]]; then
    if ! command -v docker >/dev/null 2>&1; then
      echo "Docker not found. Re-run with --no-docker to install dependencies locally." >&2
      exit 1
    fi

    echo "Installing production dependencies in ${NODE_IMAGE}"
docker run --rm \
      --user "$(id -u):$(id -g)" \
      -e HOME=/tmp \
      -e npm_config_cache=/tmp/.npm \
      -v "${BUILD_DIR}:/app" \
      -w /app \
      "${NODE_IMAGE}" \
      sh -lc 'if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi'
  else
    echo "Installing production dependencies locally"
    (
      cd "${BUILD_DIR}"
      if [[ -f package-lock.json ]]; then
        npm ci --omit=dev
      else
        npm install --omit=dev
      fi
    )
  fi
fi

RSYNC_FLAGS=(-az --delete)
if [[ "${DRY_RUN}" -eq 1 ]]; then
  RSYNC_FLAGS+=(--dry-run)
fi

echo "Ensuring remote release directories"
if [[ "${DRY_RUN}" -eq 0 ]]; then
  ssh "${HOST}" "mkdir -p '${REMOTE_ROOT}/releases' '${REMOTE_ROOT}/shared/logs'"
else
  echo "DRY RUN: ssh ${HOST} mkdir -p '${REMOTE_ROOT}/releases' '${REMOTE_ROOT}/shared/logs'"
fi

echo "Uploading release artifact"
rsync "${RSYNC_FLAGS[@]}" "${BUILD_DIR}/" "${HOST}:${RELEASE_DIR}/"

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "DRY RUN complete. No remote symlink or PM2 changes made."
  exit 0
fi

echo "Activating release"
ssh "${HOST}" "set -euo pipefail
  if [ ! -f '${REMOTE_ROOT}/shared/.env' ]; then
    if [ -f '/opt/writersarcade/apps/writersarcade-api/.env' ]; then
      cp '/opt/writersarcade/apps/writersarcade-api/.env' '${REMOTE_ROOT}/shared/.env'
    elif [ -f '/opt/writersarcade-api/.env' ]; then
      cp '/opt/writersarcade-api/.env' '${REMOTE_ROOT}/shared/.env'
    else
      echo 'Missing ${REMOTE_ROOT}/shared/.env' >&2
      exit 1
    fi
  fi
  ln -sfn '${REMOTE_ROOT}/shared/.env' '${RELEASE_DIR}/.env'
  ln -sfn '${REMOTE_ROOT}/shared/logs' '${RELEASE_DIR}/logs'
  ln -sfn '${RELEASE_DIR}' '${REMOTE_ROOT}/current'
"

if [[ "${MIGRATE_PM2}" -eq 1 ]]; then
  echo "Starting or repointing PM2 process"
  ssh "${HOST}" "cd '${REMOTE_ROOT}/current' && pm2 startOrReload ecosystem.config.cjs --only '${PM2_NAME}' --update-env"
else
  echo "Reloading existing PM2 process"
  ssh "${HOST}" "pm2 reload '${PM2_NAME}' --update-env"
fi

echo "Running health checks"
ssh "${HOST}" "curl -fsS http://127.0.0.1:3800/api/health >/dev/null"
curl -fsS "https://api.snel.famile.xyz/writersarcade/api/health" >/dev/null

echo "Pruning old releases, keeping ${KEEP_RELEASES}"
ssh "${HOST}" "set -euo pipefail
  cd '${REMOTE_ROOT}/releases'
  ls -1dt */ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
"

echo "Deployed ${PM2_NAME} ${SHA}"
