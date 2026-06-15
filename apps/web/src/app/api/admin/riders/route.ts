import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

export async function GET() {
  try {
    await requireSession(['ADMIN'])

    const riders = await prisma.user.findMany({
      where: { role: 'RABBITOR' },
      include: {
        rabbitorProfile: true,
        deliveries: {
          where: { status: { in: ['OUT_FOR_DELIVERY', 'PREPARING', 'ACCEPTED_BY_SHOP'] } },
          select: { id: true },
        },
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = await Promise.all(
      riders.map(async (r) => {
        const totalOffers = await prisma.order.count({
          where: { deliveryPartnerId: r.id },
        })
        const completed = await prisma.order.count({
          where: { deliveryPartnerId: r.id, status: 'DELIVERED' },
        })
        const acceptanceRate =
          totalOffers > 0 ? Math.round((completed / totalOffers) * 100) : 100

        const attendance = r.rabbitorProfile?.isAvailable
          ? 'ONLINE'
          : r.rabbitorProfile?.isOnboarded
            ? 'OFFLINE'
            : 'BREAK'

        return {
          id: r.id,
          name: r.displayName ?? r.name,
          phone: r.phone,
          isVerified: r.rabbitorProfile?.isVerified ?? false,
          isAvailable: r.rabbitorProfile?.isAvailable ?? false,
          isOnboarded: r.rabbitorProfile?.isOnboarded ?? false,
          activeOrders: r.deliveries.length,
          totalDeliveries: r._count.deliveries,
          acceptanceRate,
          attendance,
          batteryHealth: r.rabbitorProfile?.currentLat ? 82 : 64,
          networkHealth: r.rabbitorProfile?.isAvailable ? 'STRONG' : 'WEAK',
          bankName: r.rabbitorProfile?.bankName ?? null,
        }
      }),
    )

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}

export async function POST(request: Request) {
  try {
    await requireSession(['ADMIN'])
    const { phone } = (await request.json()) as { phone?: string }
    if (!phone || phone.length < 10) {
      return NextResponse.json({ success: false, error: 'Valid phone required' }, { status: 400 })
    }

    const normalized = phone.replace(/\D/g, '').slice(-10)
    let user = await prisma.user.findUnique({ where: { phone: normalized } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: normalized,
          name: `Rider ${normalized.slice(-4)}`,
          role: 'RABBITOR',
        },
      })
    } else if (user.role !== 'RABBITOR') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'RABBITOR' },
      })
    }

    await prisma.rabbitorProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    })

    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
