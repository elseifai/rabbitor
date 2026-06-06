import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/order-pipeline'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { customerId, shopId, totalPrice, deliveryFee, deliveryAddress, items } = body

    const newOrder = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        shopId,
        totalPrice,
        deliveryFee,
        deliveryAddress,
        destLatitude: 19.076,
        destLongitude: 72.8777,
        status: 'PENDING',
        items: {
          create: items.map((item: { productId: string; qty: number; price: number }) => ({
            productId: item.productId,
            quantity: item.qty,
            price: item.price,
          })),
        },
        statusHistory: { create: { status: 'PENDING', note: 'Order placed via API' } },
      },
    })

    return NextResponse.json({ success: true, orderId: newOrder.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Order creation failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
