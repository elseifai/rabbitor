import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const shops = await prisma.shop.findMany({
      where: { isActive: true },
      include: {
        products: {
          where: { isAvailable: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = shops.map((shop) => ({
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      rating: '4.4',
      time: `${shop.avgPrepMinutes}-${shop.avgPrepMinutes + 5} mins`,
      cuisine: shop.category,
      location: shop.address,
      image:
        shop.image ??
        'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=500&q=80',
      products: shop.products.map((p) => ({
        id: p.id,
        name: p.name,
        desc: p.description,
        price: p.price,
        weight: p.unit,
        isAvailable: p.isAvailable,
        shopId: p.shopId,
      })),
      createdAt: shop.createdAt,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch shops'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
