import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = await requireSession(['MERCHANT', 'ADMIN'])
    const body = await request.json()
    const { isAvailable, price } = body

    const product = await prisma.product.findUnique({
      where: { id },
      include: { shop: { select: { ownerId: true } } },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    if (session.role === 'MERCHANT' && product.shop.ownerId !== session.userId) {
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
