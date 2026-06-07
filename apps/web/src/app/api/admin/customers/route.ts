import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { orderGrandTotal } from '@/lib/order-totals'

export async function GET() {
  try {
    await requireSession(['ADMIN'])

    const users = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      orderBy: { createdAt: 'desc' },
      include: {
        orders: { select: { totalPrice: true, deliveryFee: true, riderTip: true, discountAmount: true } },
      },
    })

    const data = users.map((u) => ({
      id: u.id,
      name: u.displayName ?? u.name,
      phone: u.phone,
      totalOrders: u.orders.length,
      totalSpent: Math.round(
        u.orders.reduce((sum, o) => sum + orderGrandTotal(o), 0),
      ),
      joinedAt: u.createdAt.toISOString(),
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
