import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

// GOOGLE MAPS & AUTH ACTIVATION — persist rider GPS during active deliveries
export async function POST(request: Request) {
  try {
    const session = await requireSession(['RABBITOR', 'ADMIN'])
    const body = (await request.json()) as {
      lat?: number
      lng?: number
      orderId?: string
    }

    const lat = Number(body.lat)
    const lng = Number(body.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ success: false, error: 'Valid lat/lng required' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { lastLatitude: lat, lastLongitude: lng },
    })

    await prisma.rabbitorProfile.upsert({
      where: { userId: session.userId },
      create: { userId: session.userId, currentLat: lat, currentLng: lng, isAvailable: true },
      update: { currentLat: lat, currentLng: lng },
    })

    if (body.orderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: body.orderId,
          deliveryPartnerId: session.userId,
          status: { in: ['OUT_FOR_DELIVERY', 'PREPARING', 'ACCEPTED_BY_SHOP'] },
        },
      })
      if (!order) {
        return NextResponse.json({ success: false, error: 'No active order for this rider' }, { status: 404 })
      }
    }

    return NextResponse.json({
      success: true,
      lat,
      lng,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Location update failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
