import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { buildSupportReply, type SupportOrderSnapshot } from '@/lib/support-chat-engine'
import type { OrderStatus } from '@rabbit/database'

// PLATFORM CORE RESOLUTION — support chatbot API with order diagnostics
export async function POST(request: Request) {
  try {
    const session = await requireSession(['CUSTOMER', 'VENDOR', 'RABBITOR', 'ADMIN'])
    const body = (await request.json()) as { message?: string }

    if (!body.message?.trim()) {
      return NextResponse.json({ success: false, error: 'message required' }, { status: 400 })
    }

    const latest = await prisma.order.findFirst({
      where: { customerId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: { shop: { select: { name: true } } },
    })

    let latestOrder: SupportOrderSnapshot | null = null
    if (latest) {
      latestOrder = {
        orderNumber: latest.orderNumber,
        status: latest.status as OrderStatus,
        shopName: latest.shop.name,
        grandTotal: latest.totalPrice + latest.deliveryFee + latest.riderTip - latest.discountAmount,
        createdAt: latest.createdAt.toISOString(),
      }
    }

    const reply = buildSupportReply(body.message, latestOrder)

    return NextResponse.json({
      success: true,
      reply,
      latestOrder,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
