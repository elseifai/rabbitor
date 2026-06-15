import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  try {
    await requireSession(['ADMIN'])
    const { id: shopId, productId } = await params
    const body = (await request.json()) as {
      stock?: number
      price?: number
      isAvailable?: boolean
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, shopId },
    })
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(body.stock != null ? { stock: Math.max(0, Math.round(body.stock)) } : {}),
        ...(body.price != null ? { price: Math.max(0, body.price) } : {}),
        ...(typeof body.isAvailable === 'boolean' ? { isAvailable: body.isAvailable } : {}),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
