import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

/** Bind a global catalog template to a merchant shop with overrides. */
export async function POST(request: Request) {
  try {
    await requireSession(['ADMIN'])
    const body = (await request.json()) as {
      catalogItemId?: string
      shopId?: string
      storePrice?: number
      stock?: number
      maxPurchaseQty?: number
      binLocation?: string
    }

    if (!body.catalogItemId || !body.shopId) {
      return NextResponse.json(
        { success: false, error: 'catalogItemId and shopId are required' },
        { status: 400 },
      )
    }

    const [item, shop] = await Promise.all([
      prisma.masterCatalogItem.findUnique({ where: { id: body.catalogItemId } }),
      prisma.shop.findUnique({ where: { id: body.shopId } }),
    ])

    if (!item) return NextResponse.json({ success: false, error: 'Catalog item not found' }, { status: 404 })
    if (!shop) return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 })

    const price = body.storePrice ?? item.basePrice
    const stock = body.stock ?? 10
    const maxPurchaseQty = body.maxPurchaseQty ?? 10

    const existing = await prisma.product.findFirst({
      where: { shopId: body.shopId, masterCatalogItemId: item.id },
    })

    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: {
            price,
            stock,
            maxPurchaseQty,
            binLocation: body.binLocation?.trim() || null,
            isAvailable: stock > 0,
            name: item.name,
            description: item.description,
            image: item.imageUrl,
            category: item.category,
            unit: item.defaultUnit,
          },
        })
      : await prisma.product.create({
          data: {
            shopId: body.shopId,
            masterCatalogItemId: item.id,
            name: item.name,
            description: item.description,
            price,
            image: item.imageUrl,
            stock,
            maxPurchaseQty,
            binLocation: body.binLocation?.trim() || null,
            category: item.category,
            unit: item.defaultUnit,
            isAvailable: stock > 0,
          },
        })

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bind failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
