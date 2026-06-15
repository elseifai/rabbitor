import { prisma } from '@/lib/prisma'
import type { CatalogCsvRow } from '@/lib/master-catalog-csv'

export async function bulkUpsertMasterCatalog(rows: CatalogCsvRow[]) {
  let upserted = 0
  for (const row of rows) {
    await prisma.masterCatalogItem.upsert({
      where: { sku: row.sku },
      create: {
        sku: row.sku,
        name: row.name,
        category: row.category,
        subcategory: row.subcategory,
        basePrice: row.basePrice,
        description: row.description,
        imageUrl: row.imageUrl,
        storeType: row.storeType,
        defaultUnit: row.defaultUnit,
        itemType: row.itemType,
        isActive: true,
      },
      update: {
        name: row.name,
        category: row.category,
        subcategory: row.subcategory,
        basePrice: row.basePrice,
        description: row.description,
        imageUrl: row.imageUrl,
        storeType: row.storeType,
        defaultUnit: row.defaultUnit,
        itemType: row.itemType,
        isActive: true,
      },
    })
    upserted++
  }
  return upserted
}

export async function aggregateCatalogMetrics() {
  const deliveredItems = await prisma.orderItem.findMany({
    where: {
      order: { status: 'DELIVERED' },
      product: { masterCatalogItemId: { not: null } },
    },
    select: {
      quantity: true,
      price: true,
      orderId: true,
      product: { select: { masterCatalogItemId: true } },
    },
  })

  const ordersCount = new Map<string, number>()
  const revenue = new Map<string, number>()
  const orderIdsByCatalog = new Map<string, Set<string>>()

  for (const item of deliveredItems) {
    const catalogId = item.product.masterCatalogItemId
    if (!catalogId) continue
    ordersCount.set(catalogId, (ordersCount.get(catalogId) ?? 0) + item.quantity)
    revenue.set(catalogId, (revenue.get(catalogId) ?? 0) + item.price * item.quantity)
    if (!orderIdsByCatalog.has(catalogId)) orderIdsByCatalog.set(catalogId, new Set())
    orderIdsByCatalog.get(catalogId)!.add(item.orderId)
  }

  const allOrderIds = [...new Set(deliveredItems.map((i) => i.orderId))]
  const reviews =
    allOrderIds.length > 0
      ? await prisma.review.findMany({
          where: { orderId: { in: allOrderIds } },
          select: { orderId: true, shopRating: true },
        })
      : []

  const reviewByOrder = new Map(reviews.map((r) => [r.orderId, r.shopRating]))
  const ratingsByCatalog = new Map<string, number[]>()

  for (const [catalogId, orderSet] of orderIdsByCatalog) {
    const ratings: number[] = []
    for (const orderId of orderSet) {
      const rating = reviewByOrder.get(orderId)
      if (rating != null) ratings.push(rating)
    }
    ratingsByCatalog.set(catalogId, ratings)
  }

  return { ordersCount, revenue, ratingsByCatalog }
}

export async function aggregateStoreFeedback() {
  const reviews = await prisma.review.findMany({
    select: { shopId: true, shopRating: true },
  })
  const byShop = new Map<string, number[]>()
  for (const r of reviews) {
    if (!byShop.has(r.shopId)) byShop.set(r.shopId, [])
    byShop.get(r.shopId)!.push(r.shopRating)
  }
  return byShop
}
