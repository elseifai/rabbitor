import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { AddressLabel } from '@/lib/customer-address'

function serializeAddress(row: {
  id: string
  label: string
  customLabel: string | null
  line1: string
  line2: string | null
  landmark: string | null
  area: string | null
  city: string
  pincode: string | null
  latitude: number
  longitude: number
  isDefault: boolean
}) {
  return {
    id: row.id,
    label: row.label as AddressLabel,
    customLabel: row.customLabel,
    line1: row.line1,
    line2: row.line2,
    landmark: row.landmark,
    area: row.area,
    city: row.city,
    pincode: row.pincode,
    latitude: row.latitude,
    longitude: row.longitude,
    isDefault: row.isDefault,
  }
}

async function migrateLegacySavedAddress(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { savedAddress: true, lastLatitude: true, lastLongitude: true },
  })
  if (!user?.savedAddress?.trim()) return []

  const lat = user.lastLatitude ?? 19.1364
  const lng = user.lastLongitude ?? 72.8296
  const saved = user.savedAddress.trim()

  const created = await prisma.customerAddress.create({
    data: {
      userId,
      label: 'HOME',
      line1: saved.split(',')[0]?.trim() || saved,
      line2: saved.includes(',') ? saved.split(',').slice(1).join(',').trim() : null,
      area: null,
      city: 'Mumbai',
      latitude: lat,
      longitude: lng,
      isDefault: true,
    },
  })

  return [created]
}

/** GET /api/user/addresses — list saved delivery addresses */
export async function GET() {
  try {
    const session = await requireSession(['CUSTOMER', 'ADMIN'])
    let rows = await prisma.customerAddress.findMany({
      where: { userId: session.userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    })

    if (rows.length === 0) {
      rows = await migrateLegacySavedAddress(session.userId)
    }

    return NextResponse.json({
      success: true,
      data: rows.map(serializeAddress),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load addresses'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}

/** POST /api/user/addresses — save a new delivery address */
export async function POST(request: Request) {
  try {
    const session = await requireSession(['CUSTOMER', 'ADMIN'])
    const body = await request.json()

    const label = (body.label as AddressLabel) || 'HOME'
    const line1 = typeof body.line1 === 'string' ? body.line1.trim() : ''
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)

    if (!line1) {
      return NextResponse.json({ success: false, error: 'House / flat details are required' }, { status: 400 })
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ success: false, error: 'Valid location coordinates required' }, { status: 400 })
    }

    const setDefault = Boolean(body.isDefault)
    const existingCount = await prisma.customerAddress.count({ where: { userId: session.userId } })
    const shouldDefault = setDefault || existingCount === 0

    if (shouldDefault) {
      await prisma.customerAddress.updateMany({
        where: { userId: session.userId },
        data: { isDefault: false },
      })
    }

    const created = await prisma.customerAddress.create({
      data: {
        userId: session.userId,
        label,
        customLabel: typeof body.customLabel === 'string' ? body.customLabel.trim() || null : null,
        line1,
        line2: typeof body.line2 === 'string' ? body.line2.trim() || null : null,
        landmark: typeof body.landmark === 'string' ? body.landmark.trim() || null : null,
        area: typeof body.area === 'string' ? body.area.trim() || null : null,
        city: typeof body.city === 'string' && body.city.trim() ? body.city.trim() : 'Mumbai',
        pincode: typeof body.pincode === 'string' ? body.pincode.trim() || null : null,
        latitude,
        longitude,
        isDefault: shouldDefault,
      },
    })

    const formatted = [created.line1, created.line2, created.landmark, created.area, created.city, created.pincode]
      .filter(Boolean)
      .join(', ')

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        lastLatitude: latitude,
        lastLongitude: longitude,
        savedAddress: formatted,
      },
    })

    return NextResponse.json({ success: true, data: serializeAddress(created) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save address'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
