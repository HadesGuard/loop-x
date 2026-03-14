#!/usr/bin/env bash

# Idempotent production deploy for LoopX using docker compose
# - Builds images
# - Starts/updates services with minimal downtime
# - Waits on healthchecks where available
#
# Requirements:
# - docker compose v2.20+ (supports --wait)
# - docker engine with access to the project folder
# - TLS certs placed under deploy/nginx/certs (or mount from host)

set -euo pipefail

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
PROJECT_NAME=${COMPOSE_PROJECT_NAME:-loopx}

echo "[deploy] Using compose file: ${COMPOSE_FILE} (project: ${PROJECT_NAME})"

# Warn if TLS certs are missing (Nginx still serves HTTP)
if [[ ! -f "deploy/nginx/certs/fullchain.pem" || ! -f "deploy/nginx/certs/privkey.pem" ]]; then
  echo "[deploy] Note: TLS certificates not found in deploy/nginx/certs. HTTPS will not be enabled until certs are mounted."
fi

# Build app images (backend, frontend)
echo "[deploy] Building images (backend, frontend)"
docker compose -f "$COMPOSE_FILE" build backend frontend

# Bring up shared infra (db, cache) first
echo "[deploy] Starting databases (postgres, redis)"
docker compose -f "$COMPOSE_FILE" up -d postgres redis

# Start/refresh backend and worker, wait for backend health
echo "[deploy] Starting backend + worker"
docker compose -f "$COMPOSE_FILE" up -d backend worker

echo "[deploy] Waiting for backend to become healthy"
if docker compose -f "$COMPOSE_FILE" up -d --wait backend >/dev/null 2>&1; then
  echo "[deploy] Backend healthy"
else
  echo "[deploy] Warning: compose --wait not supported or healthcheck failed. Continuing."
fi

# Start/refresh frontend and nginx last
echo "[deploy] Starting frontend + nginx"
docker compose -f "$COMPOSE_FILE" up -d frontend nginx

echo "[deploy] Deployment complete. Current status:"
docker compose -f "$COMPOSE_FILE" ps

# Optional manual step: run DB migrations out-of-band if required.
# The runtime image is production-pruned, so prisma CLI is not included.
# See README/manual steps in the DevOps handoff for guidance.

