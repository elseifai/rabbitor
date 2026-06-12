import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

const PRODUCT_SELECT = {
  id: true,
  shopId: true,
  name: true,
  description: true,
  price: true,
  mrp: true,
  unit: true,
  image: true,
  isAvailable: true,
  stock: true,
  category: true,
  shop: {
    select: {
      id: true,
      name: true,
      slug: true,
      storeType: true,
      category: true,
    },
  },
} as const

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      select: PRODUCT_SELECT,
    })

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    const similar = await prisma.product.findMany({
      where: {
        id: { not: id },
        isAvailable: true,
        category: product.category,
        shopId: product.shopId,
      },
      orderBy: { name: 'asc' },
      take: 10,
      select: PRODUCT_SELECT,
    })

    return NextResponse.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          mrp: product.mrp,
          unit: product.unit,
          image: product.image,
          stock: product.stock,
          category: product.category,
          isAvailable: product.isAvailable,
          shopId: product.shopId,
          shopName: product.shop.name,
          shopSlug: product.shop.slug,
          storeType: product.shop.storeType,
        },
        similar: similar.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          mrp: p.mrp,
          unit: p.unit,
          image: p.image,
          stock: p.stock,
          category: p.category,
          isAvailable: p.isAvailable,
          shopId: p.shopId,
          shopName: p.shop.name,
          shopSlug: p.shop.slug,
          storeType: p.shop.storeType,
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch product'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const body = await request.json()
    const { isAvailable, price } = body

    const product = await prisma.product.findUnique({
      where: { id },
      include: { shop: { select: { ownerId: true } } },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    if (session.role === 'VENDOR' && product.shop.ownerId !== session.userId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(isAvailable !== undefined && { isAvailable }),
        ...(price !== undefined && { price: parseFloat(price) }),
      },
    })

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      data: updatedProduct,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
