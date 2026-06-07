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
RUN pnpm --filter @rabbit/api build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apk add --no-cache openssl libc6-compat wget

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages packages
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/node_modules node_modules

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
