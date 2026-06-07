#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.docker ]]; then
  echo "Creating .env.docker from .env.docker.example"
  cp .env.docker.example .env.docker
  echo "Edit .env.docker (JWT_SECRET, PUBLIC_* URLs) before production deploy."
fi

echo "Building and starting Rabbit stack (postgres, redis, migrate, api, web)..."
docker compose --env-file .env.docker --profile app up -d --build

echo ""
echo "Rabbit is starting:"
echo "  Web:  http://localhost:${WEB_PORT:-3000}"
echo "  API:  http://localhost:${API_PORT:-4000}/api/v1/health"
echo ""
echo "Logs:  pnpm docker:logs"
echo "Stop:  pnpm docker:deploy:down"
