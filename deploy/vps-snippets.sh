#!/usr/bin/env bash
# VPS monitoring snippets — run on the server from ~/rabbitor
# Usage: copy/paste sections below, or: bash deploy/vps-snippets.sh logs

set -euo pipefail
cd ~/rabbitor 2>/dev/null || cd "$(dirname "$0")/.."

case "${1:-help}" in
  logs)
    sudo docker compose --env-file .env.docker logs -f web api
    ;;
  ps)
    sudo docker compose --env-file .env.docker ps
    ;;
  studio)
    # Postgres is on the Docker network — run Studio inside the migrate image.
    sudo docker compose --env-file .env.docker --profile app run --rm \
      -p 127.0.0.1:5555:5555 migrate sh -c \
      "pnpm --filter @rabbit/database exec prisma studio --browser none --port 5555"
    ;;
  help|*)
    cat <<'EOF'
cd ~/rabbitor

# Stream real-time logs for Auth, Checkout, and Mail dispatch cycles
sudo docker compose --env-file .env.docker logs -f web api

# Inspect database metrics and verified role records directly via Prisma Studio
# (local monorepo with DATABASE_URL reachable from host)
pnpm --filter @rabbit/database exec prisma studio
# On VPS, postgres is internal-only — use: bash deploy/vps-snippets.sh studio
# then SSH tunnel: ssh -L 5555:127.0.0.1:5555 dreamsight11@103.108.117.160

# View container runtime statuses and resource overhead allocations
sudo docker compose --env-file .env.docker ps

# Shortcuts: bash deploy/vps-snippets.sh logs|ps|studio
EOF
    ;;
esac
