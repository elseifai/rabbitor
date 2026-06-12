#!/usr/bin/env bash
# Rabbit — one-shot VPS deploy (Postgres + Redis + API + Web, all containerized)
#
# Usage on the VPS (after `git clone` + `cp .env.docker.example .env.docker` + editing it):
#   bash scripts/deploy-vps.sh
#
# Re-run any time to ship new code. Set RUN_SEED=false in .env.docker after the
# first successful deploy so it doesn't re-seed the database.

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.docker ]; then
  echo "ERROR: .env.docker not found."
  echo "Run: cp .env.docker.example .env.docker  then edit it with your real values."
  exit 1
fi

# Fail early if critical secrets are still defaults
if grep -q 'change-me' .env.docker; then
  echo "ERROR: JWT_SECRET is still the default. Edit .env.docker first."
  echo "Generate one with: openssl rand -base64 32"
  exit 1
fi

echo "==> Pulling latest code"
git pull --ff-only || echo "(skipping git pull — not a clean fast-forward)"

# Compose interpolates ${DATABASE_URL} from .env — keep it in sync with .env.docker
ln -sf .env.docker .env

if ! grep -q '^DATABASE_URL=' .env.docker; then
  echo "ERROR: DATABASE_URL missing from .env.docker."
  echo "Add: DATABASE_URL=postgresql://USER:PASSWORD@postgres:5432/rabbit?schema=public"
  echo "URL-encode special characters in the password (+ / = etc.)."
  exit 1
fi

echo "==> Rebuilding API image (no cache — ensures deps like express are bundled)"
docker compose --env-file .env.docker --profile app build --no-cache api

echo "==> Building and starting full stack (postgres, redis, migrate, api, web)"
docker compose --env-file .env.docker --profile app up -d --build

echo "==> Waiting for services to become healthy..."
sleep 5
docker compose --env-file .env.docker --profile app ps

echo ""
echo "Done. Check health:"
echo "  curl -s http://localhost:4000/api/v1/health"
echo "  curl -sI http://localhost:3000/"
echo ""
echo "Logs:  docker compose --profile app logs -f"
