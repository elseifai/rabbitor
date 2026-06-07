# Build from monorepo root: docker build -f apps/api/Dockerfile -t rabbit-api .

FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apk add --no-cache openssl libc6-compat

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages packages
COPY apps/api apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm db:generate
RUN pnpm --filter @rabbit/shared build
RUN pnpm --filter @rabbit/database build
RUN pnpm --filter @rabbit/api build
RUN pnpm --filter @rabbit/api deploy --prod /prod/api
RUN PRISMA_SCHEMA=$(find /prod/api -path '*/@rabbit/database/prisma/schema.prisma' | head -1) && \
    cd /prod/api && npx prisma@6.19.3 generate --schema="$PRISMA_SCHEMA"

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN apk add --no-cache openssl libc6-compat wget

COPY --from=builder /prod/api ./

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health || exit 1

CMD ["node", "dist/index.js"]
