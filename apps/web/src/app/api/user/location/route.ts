import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

// LIVE ECOSYSTEM UPGRADE — persist coordinates per role (customer / merchant / rider)
export async function POST(request: Request) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const lat = Number(body.lat)
    const lng = Number(body.lng)
    const address = typeof body.address === 'string' ? body.address.trim() : undefined

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ success: false, error: 'Valid coordinates required' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        lastLatitude: lat,
        lastLongitude: lng,
        ...(address ? { savedAddress: address } : {}),
      },
    })

    if (session.role === 'RABBITOR') {
      await prisma.rabbitorProfile.upsert({
        where: { userId: session.userId },
        create: { userId: session.userId, currentLat: lat, currentLng: lng },
        update: { currentLat: lat, currentLng: lng },
      })
    }

    if (session.role === 'VENDOR' || session.role === 'ADMIN') {
      const shop = await prisma.shop.findFirst({ where: { ownerId: session.userId } })
      if (shop) {
        await prisma.shop.update({
          where: { id: shop.id },
          data: {
            latitude: lat,
            longitude: lng,
            ...(address ? { address } : {}),
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      role: session.role,
      lat,
      lng,
      address: address ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Location sync failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
