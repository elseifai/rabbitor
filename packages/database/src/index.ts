import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

/** Prisma is cached in dev; recreate if the client predates a schema change. */
function hasCustomerAddress(client: PrismaClient): boolean {
  return typeof (client as PrismaClient & { customerAddress?: unknown }).customerAddress !== 'undefined'
}

function resolvePrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma
  if (cached && hasCustomerAddress(cached)) {
    return cached
  }

  if (cached) {
    void cached.$disconnect()
  }

  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  return client
}

export const prisma = resolvePrismaClient()

export * from '@prisma/client'
