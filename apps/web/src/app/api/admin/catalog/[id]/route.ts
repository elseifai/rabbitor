import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import {
  assignVelocityBadges,
  computePositiveFeedbackPercent,
  parseCatalogItemType,
} from '@/lib/catalog-performance'
import { aggregateCatalogMetrics } from '@/lib/master-catalog-metrics'
import type { StoreType } from '@rabbit/database'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(['ADMIN'])
    const { id } = await params

    const item = await prisma.masterCatalogItem.findUnique({
      where: { id },
      include: {
        shopProducts: {
          include: {
            shop: { select: { id: true, name: true, storeType: true, isActive: true } },
          },
          orderBy: { shop: { name: 'asc' } },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ success: false, error: 'Catalog item not found' }, { status: 404 })
    }

    const orderItems = await prisma.orderItem.findMany({
      where: {
        product: { masterCatalogItemId: id },
        order: { status: { in: ['DELIVERED', 'CANCELLED'] } },
      },
      select: {
        quantity: true,
        price: true,
        orderId: true,
        order: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            orderNumber: true,
            createdAt: true,
          },
        },
      },
    })

    const delivered = orderItems.filter((i) => i.order.status === 'DELIVERED')
    const lifetimeOrdersCount = delivered.reduce((s, i) => s + i.quantity, 0)
    const lifetimeRevenue = Math.round(delivered.reduce((s, i) => s + i.price * i.quantity, 0))

    const orderIds = [...new Set(delivered.map((i) => i.orderId))]
    const reviews =
      orderIds.length > 0
        ? await prisma.review.findMany({
            where: { orderId: { in: orderIds } },
            select: {
              shopRating: true,
              riderRating: true,
              comment: true,
              createdAt: true,
              orderId: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : []

    const refundCount = orderItems.filter(
      (i) => i.order.paymentStatus === 'REFUNDED' || i.order.status === 'CANCELLED',
    ).length

    const metrics = await aggregateCatalogMetrics()
    const badge = assignVelocityBadges([
      { id, lifetimeOrdersCount: metrics.ordersCount.get(id) ?? lifetimeOrdersCount },
    ]).get(id)

    return NextResponse.json({
      success: true,
      data: {
        item: {
          id: item.id,
          sku: item.sku,
          name: item.name,
          description: item.description,
          itemType: item.itemType,
          category: item.category,
          subcategory: item.subcategory,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
          storeType: item.storeType,
          defaultUnit: item.defaultUnit,
          lifetimeOrdersCount,
          lifetimeRevenue,
          customerFeedbackPositivePercent: computePositiveFeedbackPercent(
            reviews.map((r) => r.shopRating),
          ),
          velocityLabel: badge?.velocityLabel ?? '⚠️ Low Demand',
        },
        assortment: item.shopProducts.map((p) => ({
          shopId: p.shop.id,
          shopName: p.shop.name,
          storeType: p.shop.storeType,
          isActive: p.shop.isActive,
          productId: p.id,
          storePrice: p.price,
          stock: p.stock,
          binLocation: p.binLocation,
          isAvailable: p.isAvailable,
        })),
        feedback: {
          reviews: reviews.map((r) => ({
            stars: r.shopRating,
            riderStars: r.riderRating,
            comment: r.comment,
            date: r.createdAt.toISOString(),
          })),
          refundCount,
          positivePercent: computePositiveFeedbackPercent(reviews.map((r) => r.shopRating)),
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(['ADMIN'])
    const { id } = await params
    const body = (await request.json()) as {
      name?: string
      description?: string | null
      category?: string
      subcategory?: string | null
      basePrice?: number
      imageUrl?: string | null
      sku?: string
      itemType?: string
      storeType?: StoreType
      isActive?: boolean
    }

    const data: Record<string, unknown> = {}
    if (body.name?.trim()) data.name = body.name.trim()
    if (body.description !== undefined) data.description = body.description
    if (body.category?.trim()) data.category = body.category.trim()
    if (body.subcategory !== undefined) data.subcategory = body.subcategory
    if (body.basePrice != null) data.basePrice = Math.max(0, body.basePrice)
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl
    if (body.sku?.trim()) data.sku = body.sku.trim().toUpperCase()
    if (body.itemType) data.itemType = parseCatalogItemType(body.itemType)
    if (body.storeType) data.storeType = body.storeType
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields' }, { status: 400 })
    }

    const updated = await prisma.masterCatalogItem.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(['ADMIN'])
    const { id } = await params

    // Detach any linked shop products first (set FK to null) so the delete succeeds
    await prisma.product.updateMany({
      where: { masterCatalogItemId: id },
      data: { masterCatalogItemId: null },
    })

    await prisma.masterCatalogItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
