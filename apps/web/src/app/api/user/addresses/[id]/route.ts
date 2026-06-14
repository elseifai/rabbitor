import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { AddressLabel } from '@/lib/customer-address'

type RouteContext = { params: Promise<{ id: string }> }

/** PATCH /api/user/addresses/[id] — update or set default */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSession(['CUSTOMER', 'ADMIN'])
    const { id } = await context.params
    const body = await request.json()

    const existing = await prisma.customerAddress.findFirst({
      where: { id, userId: session.userId },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Address not found' }, { status: 404 })
    }

    if (body.isDefault === true) {
      await prisma.customerAddress.updateMany({
        where: { userId: session.userId },
        data: { isDefault: false },
      })
    }

    const updated = await prisma.customerAddress.update({
      where: { id },
      data: {
        ...(body.label ? { label: body.label as AddressLabel } : {}),
        ...(typeof body.customLabel === 'string' ? { customLabel: body.customLabel.trim() || null } : {}),
        ...(typeof body.line1 === 'string' ? { line1: body.line1.trim() } : {}),
        ...(typeof body.line2 === 'string' ? { line2: body.line2.trim() || null } : {}),
        ...(typeof body.landmark === 'string' ? { landmark: body.landmark.trim() || null } : {}),
        ...(typeof body.area === 'string' ? { area: body.area.trim() || null } : {}),
        ...(typeof body.city === 'string' ? { city: body.city.trim() || 'Mumbai' } : {}),
        ...(typeof body.pincode === 'string' ? { pincode: body.pincode.trim() || null } : {}),
        ...(Number.isFinite(Number(body.latitude)) ? { latitude: Number(body.latitude) } : {}),
        ...(Number.isFinite(Number(body.longitude)) ? { longitude: Number(body.longitude) } : {}),
        ...(body.isDefault === true ? { isDefault: true } : {}),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        label: updated.label,
        customLabel: updated.customLabel,
        line1: updated.line1,
        line2: updated.line2,
        landmark: updated.landmark,
        area: updated.area,
        city: updated.city,
        pincode: updated.pincode,
        latitude: updated.latitude,
        longitude: updated.longitude,
        isDefault: updated.isDefault,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update address'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}

/** DELETE /api/user/addresses/[id] */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession(['CUSTOMER', 'ADMIN'])
    const { id } = await context.params

    const existing = await prisma.customerAddress.findFirst({
      where: { id, userId: session.userId },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Address not found' }, { status: 404 })
    }

    await prisma.customerAddress.delete({ where: { id } })

    if (existing.isDefault) {
      const next = await prisma.customerAddress.findFirst({
        where: { userId: session.userId },
        orderBy: { updatedAt: 'desc' },
      })
      if (next) {
        await prisma.customerAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete address'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
