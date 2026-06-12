import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

// MERCHANT DASHBOARD EXPANSION — hyperlocal store health & rush-hour signals
export async function GET() {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])

    const shop = await prisma.shop.findFirst({
      where: { ownerId: session.userId },
      select: { id: true, isActive: true },
    })

    if (!shop) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 })
    }

    const orders = await prisma.order.findMany({
      where: { shopId: shop.id },
      select: { status: true, statusHistory: { select: { status: true, note: true } } },
    })

    let accepted = 0
    let rejected = 0

    for (const order of orders) {
      if (order.status === 'CANCELLED') {
        const wasPending = order.statusHistory.some((h) => h.status === 'PENDING')
        if (wasPending) rejected += 1
      } else if (order.status !== 'PENDING') {
        accepted += 1
      }
    }

    const totalDecisions = accepted + rejected
    const acceptanceRate = totalDecisions > 0 ? Math.round((accepted / totalDecisions) * 100) : 100
    const rejectionRate = totalDecisions > 0 ? Math.round((rejected / totalDecisions) * 100) : 0
    const healthScore = Math.max(0, Math.min(100, acceptanceRate - Math.round(rejectionRate * 0.5)))

    const preparingCount = await prisma.order.count({
      where: { shopId: shop.id, status: 'PREPARING' },
    })

    const lowStockProducts = await prisma.product.findMany({
      where: {
        shopId: shop.id,
        OR: [{ stock: { lte: 3 } }, { isAvailable: false }],
      },
      select: { id: true, name: true, stock: true, isAvailable: true },
      take: 20,
    })

    return NextResponse.json({
      success: true,
      health: {
        score: healthScore,
        acceptanceRate,
        rejectionRate,
        accepted,
        rejected,
      },
      rushHour: {
        active: preparingCount > 3,
        preparingCount,
        suggestPause: preparingCount > 3 && shop.isActive,
      },
      stockWarnings: lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        isAvailable: p.isAvailable,
        reason: p.stock <= 3 ? 'LOW_STOCK' : 'UNAVAILABLE',
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health check failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
