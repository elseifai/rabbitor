import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { ORDER_STATUS_LABELS } from '@/lib/order-pipeline'
import { orderGrandTotal } from '@/lib/order-totals'
import type { OrderStatus } from '@rabbit/database'

export async function GET(request: Request) {
  try {
    await requireSession(['ADMIN'])

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as OrderStatus | 'ALL' | 'ACTIVE' | null
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))
    const skip = (page - 1) * limit

    const where =
      status && status !== 'ALL'
        ? status === 'ACTIVE'
          ? { status: { in: ['PENDING', 'ACCEPTED_BY_SHOP', 'PREPARING', 'OUT_FOR_DELIVERY'] as OrderStatus[] } }
          : { status }
        : {}

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shop: { select: { name: true } },
          customer: { select: { name: true, phone: true } },
          items: { select: { id: true } },
        },
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        shopName: o.shop.name,
        customerName: o.customer.name,
        customerPhone: o.customer.phone,
        itemCount: o.items.length,
        amount: Math.round(orderGrandTotal(o)),
        status: o.status,
        statusLabel: ORDER_STATUS_LABELS[o.status],
        createdAt: o.createdAt.toISOString(),
      })),
      pagination: { page, limit, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
