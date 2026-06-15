import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession(['ADMIN'])
    const { id } = await params
    const body = (await request.json()) as {
      isActive?: boolean
      minOrderValue?: number
      packingCharge?: number
      deliveryRadiusKm?: number
      avgPrepMinutes?: number
      openingHours?: unknown
    }

    const data: Record<string, unknown> = {}
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive
    if (body.minOrderValue != null) data.minOrderValue = Math.max(0, body.minOrderValue)
    if (body.packingCharge != null) data.packingCharge = Math.max(0, body.packingCharge)
    if (body.deliveryRadiusKm != null) data.deliveryRadiusKm = Math.max(0.5, body.deliveryRadiusKm)
    if (body.avgPrepMinutes != null) data.avgPrepMinutes = Math.max(5, Math.round(body.avgPrepMinutes))
    if (body.openingHours != null) data.openingHours = body.openingHours

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields' }, { status: 400 })
    }

    const shop = await prisma.shop.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: shop })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
