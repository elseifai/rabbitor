import { prisma } from '@/lib/prisma'
import { distanceKm, estimateDeliveryMinutes } from '@/lib/geo'

export type FulfillmentCartItem = {
  productId: string
  quantity: number
}

export type FulfillmentStore = {
  storeId: string
  storeName: string
  storeSlug: string
  storeType: string
  imageUrl: string | null
  ratingAvg: number
  distanceKm: number
  etaMinutes: number
  availableCount: number
  totalRequested: number
  fulfillmentType: 'FULL' | 'PARTIAL'
  fulfillmentLabel: string
  availableItems: Array<{ productId: string; name: string; availableStock: number }>
  missingItems: Array<{ productId: string; name: string; requested: number }>
  deliveryFee: number
}

function buildFulfillmentLabel(available: number, total: number): string {
  if (available >= total) return `All ${total} items available`
  return `${available}/${total} items available`
}

/** Rank nearby stores by Essentials / master-catalog fulfillment completeness. */
export async function rankFulfillmentStores(params: {
  items: FulfillmentCartItem[]
  lat: number
  lng: number
  radiusKm?: number
}): Promise<FulfillmentStore[]> {
  const { items, lat, lng, radiusKm = 25 } = params

  if (items.length === 0) return []

  const productIds = items.map((i) => i.productId)
  const uniqueProductCount = productIds.length

  const stores = await prisma.shop.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      storeType: true,
      image: true,
      ratingAvg: true,
      latitude: true,
      longitude: true,
      avgPrepMinutes: true,
      baseDeliveryFee: true,
      products: {
        where: {
          isAvailable: true,
          OR: [{ id: { in: productIds } }, { masterCatalogItemId: { in: productIds } }],
        },
        select: { id: true, name: true, stock: true, masterCatalogItemId: true },
      },
    },
  })

  const results: FulfillmentStore[] = []

  for (const store of stores) {
    const dist = distanceKm(lat, lng, store.latitude, store.longitude)
    if (dist > radiusKm) continue

    const productMap = new Map<string, (typeof store.products)[0]>()
    for (const p of store.products) {
      productMap.set(p.id, p)
      if (p.masterCatalogItemId) productMap.set(p.masterCatalogItemId, p)
    }

    const availableItems: FulfillmentStore['availableItems'] = []
    const missingItems: FulfillmentStore['missingItems'] = []

    for (const cartItem of items) {
      const product = productMap.get(cartItem.productId)
      const canFulfill = product && product.stock >= cartItem.quantity
      if (canFulfill && product) {
        availableItems.push({
          productId: cartItem.productId,
          name: product.name,
          availableStock: product.stock,
        })
      } else {
        missingItems.push({
          productId: cartItem.productId,
          name: product?.name ?? `Product ${cartItem.productId.slice(0, 8)}`,
          requested: cartItem.quantity,
        })
      }
    }

    if (availableItems.length === 0) continue

    const availableCount = availableItems.length
    const fulfillmentType: 'FULL' | 'PARTIAL' =
      availableCount >= uniqueProductCount ? 'FULL' : 'PARTIAL'

    results.push({
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
      storeType: store.storeType,
      imageUrl: store.image,
      ratingAvg: store.ratingAvg > 0 ? store.ratingAvg : 4.2,
      distanceKm: Math.round(dist * 10) / 10,
      etaMinutes: estimateDeliveryMinutes(dist, store.avgPrepMinutes),
      availableCount,
      totalRequested: uniqueProductCount,
      fulfillmentType,
      fulfillmentLabel: buildFulfillmentLabel(availableCount, uniqueProductCount),
      availableItems,
      missingItems,
      deliveryFee: store.baseDeliveryFee,
    })
  }

  results.sort((a, b) => {
    if (a.fulfillmentType !== b.fulfillmentType) {
      return a.fulfillmentType === 'FULL' ? -1 : 1
    }
    return a.distanceKm - b.distanceKm
  })

  return results
}

/** Pick the best store to fulfill an Essentials cart (FULL preferred, else nearest partial). */
export async function pickAutoFulfillmentStoreId(
  items: FulfillmentCartItem[],
  lat: number,
  lng: number,
): Promise<string | null> {
  let ranked = await rankFulfillmentStores({ items, lat, lng, radiusKm: 25 })
  if (ranked.length === 0) {
    ranked = await rankFulfillmentStores({ items, lat, lng, radiusKm: 80 })
  }

  if (ranked.length > 0) {
    const full = ranked.find((s) => s.fulfillmentType === 'FULL')
    return (full ?? ranked[0])!.storeId
  }

  const fallback = await prisma.shop.findFirst({
    where: { isActive: true },
    orderBy: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
    select: { id: true },
  })
  return fallback?.id ?? null
}
