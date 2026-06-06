# Rabbit — Full-Stack Monorepo

Hyperlocal delivery platform for local kiranas and shops (groceries, fish, footwear, clothing, and more).

## Project structure

```
Rabbitors/
├── apps/
│   ├── web/                 # Next.js 15 (App Router) — customer, merchant, delivery UI
│   │   ├── src/app/         # Routes: /, /merchant, /delivery, /cart
│   │   ├── src/components/  # UI: home, layout
│   │   ├── src/store/       # Zustand: cart, location
│   │   └── tailwind.config.ts
│   └── api/                 # Express REST API (legacy Phase 1)
├── packages/
│   ├── database/            # Unified Prisma schema + client
│   └── shared/              # Shared TypeScript enums/types
├── docker-compose.yml       # PostgreSQL + Redis
└── pnpm-workspace.yaml
```

## Tech stack

| Layer | Technology |
|-------|------------|
| Web | Next.js 15, React 19, Tailwind CSS, Lucide, Zustand |
| Database | PostgreSQL + Prisma (`@rabbit/database`) |
| API | Express (`apps/api`) + future Next.js Server Actions |
| Mobile | Mobile-first responsive web (React Native apps planned) |

## Quick start

```bash
pnpm install
pnpm docker:up
cp .env.example packages/database/.env
cp packages/database/.env apps/web/.env.local   # add DATABASE_URL

pnpm db:generate
pnpm db:push
pnpm web:dev
```

- **Web:** http://localhost:3000  
- **API:** http://localhost:3000/api/v1 (when running `pnpm dev:api`)

## Modules

1. **Customer (`/`)** — Location picker, categories, featured shops, cart  
2. **Merchant (`/merchant`)** — Dashboard shell for products, orders, analytics  
3. **Delivery (`/delivery`)** — Rabbitor partner job list & navigation layout  

## Database schema

See `packages/database/prisma/schema.prisma` for:

- `User`, `Address`
- `MerchantProfile`, `Shop`, `Category`, `ShopCategory`
- `Product`
- `Order`, `OrderItem`
- `DeliveryPartner`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm web:dev` | Start Next.js web app |
| `pnpm dev:api` | Start Express API |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:push` | Push schema to DB |
| `pnpm db:seed` | Seed categories |
