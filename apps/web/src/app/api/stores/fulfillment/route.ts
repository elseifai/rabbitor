/**
 * Store Fulfillment Check API
 *
 * POST /api/stores/fulfillment
 *
 * Given a customer's cart items and location, returns nearby stores ranked
 * by fulfillment completeness. Used by the checkout flow to detect when the
 * nearest dark store can only partially fill the cart, and present the
 * customer with a choice between Express (partial) and Standard (full) delivery.
 *
 * Response body:
 * {
 *   success: true,
 *   data: FulfillmentStore[]   // sorted: FULL first, then PARTIAL by distance
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { distanceKm, estimateDeliveryMinutes } from '@/lib/geo'

type CartItemInput = {
  productId: string
  quantity: number
}

export type FulfillmentStore = {
  storeId: string
  storeName: string
  storeSlug: string
  storeType: string
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      items?: CartItemInput[]
      lat?: number
      lng?: number
      radiusKm?: number
    }

    const { items, lat = 19.1364, lng = 72.8296, radiusKm = 25 } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart items are required' },
        { status: 400 },
      )
    }

    const productIds = items.map((i) => i.productId)
    const totalRequested = items.reduce((sum, i) => sum + i.quantity, 0)
    const uniqueProductCount = productIds.length

    // Find all active stores and their matching products in one query
    const stores = await prisma.shop.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        storeType: true,
        latitude: true,
        longitude: true,
        avgPrepMinutes: true,
        baseDeliveryFee: true,
        products: {
          where: {
            isAvailable: true,
            OR: [
              { id: { in: productIds } },
              { masterCatalogItemId: { in: productIds } },
            ],
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
      let availableQtyTotal = 0

      for (const cartItem of items) {
        const product = productMap.get(cartItem.productId)
        const canFulfill = product && product.stock >= cartItem.quantity
        if (canFulfill && product) {
          availableItems.push({
            productId: cartItem.productId,
            name: product.name,
            availableStock: product.stock,
          })
          availableQtyTotal += cartItem.quantity
        } else {
          missingItems.push({
            productId: cartItem.productId,
            name: product?.name ?? `Product ${cartItem.productId.slice(0, 8)}`,
            requested: cartItem.quantity,
          })
        }
      }

      // Only surface stores that can fill at least 1 item
      if (availableItems.length === 0) continue

      const availableCount = availableItems.length
      const fulfillmentType: 'FULL' | 'PARTIAL' =
        availableCount >= uniqueProductCount ? 'FULL' : 'PARTIAL'

      const eta = estimateDeliveryMinutes(dist, store.avgPrepMinutes)

      results.push({
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        storeType: store.storeType,
        distanceKm: Math.round(dist * 10) / 10,
        etaMinutes: eta,
        availableCount,
        totalRequested: uniqueProductCount,
        fulfillmentType,
        fulfillmentLabel: buildFulfillmentLabel(availableCount, uniqueProductCount),
        availableItems,
        missingItems,
        deliveryFee: store.baseDeliveryFee,
      })
    }

    // Sort strategy: FULL stores first, then PARTIAL. Within same type: nearest first.
    results.sort((a, b) => {
      if (a.fulfillmentType !== b.fulfillmentType) {
        return a.fulfillmentType === 'FULL' ? -1 : 1
      }
      return a.distanceKm - b.distanceKm
    })

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fulfillment check failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
