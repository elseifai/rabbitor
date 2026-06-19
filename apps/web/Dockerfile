# Build from monorepo root:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000 \
#     --build-arg NEXT_PUBLIC_SOCKET_SERVER_URL=http://localhost:4000 \
#     -t rabbit-web .

FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apk add --no-cache openssl libc6-compat

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages packages
COPY apps/web apps/web

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_SOCKET_SERVER_URL=http://localhost:4000
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID=
ARG NEXT_PUBLIC_DEV_SANDBOX=false
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_SERVER_URL=$NEXT_PUBLIC_SOCKET_SERVER_URL
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID
ENV NEXT_PUBLIC_DEV_SANDBOX=$NEXT_PUBLIC_DEV_SANDBOX
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV DATABASE_URL=postgresql://rabbit:rabbit@postgres:5432/rabbit?schema=public
ENV JWT_SECRET=build-time-placeholder

RUN pnpm install --frozen-lockfile
RUN pnpm db:generate
RUN pnpm --filter @rabbit/database build
RUN pnpm --filter @rabbit/web build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apk add --no-cache openssl libc6-compat wget

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages packages
COPY --from=builder /app/apps/web apps/web
COPY --from=builder /app/node_modules node_modules

WORKDIR /app/apps/web

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["pnpm", "start"]
