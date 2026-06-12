import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

// PLATFORM CORE RESOLUTION — merchant bulk product import
export async function POST(request: Request) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const body = (await request.json()) as {
      shopId?: string
      items?: {
        name: string
        category?: string
        price: number
        unit?: string
        stock?: number
        description?: string
        imageUrl?: string
      }[]
    }

    if (!body.shopId || !body.items?.length) {
      return NextResponse.json({ success: false, error: 'shopId and items required' }, { status: 400 })
    }

    const shop = await prisma.shop.findFirst({
      where: { id: body.shopId, ownerId: session.userId },
    })
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 })
    }

    const created = await prisma.$transaction(
      body.items.map((item) =>
        prisma.product.create({
          data: {
            shopId: body.shopId!,
            name: item.name.trim(),
            category: item.category?.trim() || 'custom',
            price: item.price,
            unit: item.unit?.trim() || 'piece',
            stock: item.stock ?? 10,
            description: item.description?.trim() || null,
            image: item.imageUrl?.trim() || null,
            isAvailable: true,
          },
        }),
      ),
    )

    return NextResponse.json({ success: true, count: created.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
