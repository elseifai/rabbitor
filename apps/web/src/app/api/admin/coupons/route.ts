import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { DiscountType } from '@rabbit/database'

export async function GET() {
  try {
    await requireSession(['ADMIN'])

    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
    const data = coupons.map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderValue: c.minOrderValue,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      remainingUses: Math.max(0, c.maxUses - c.usedCount),
      expiresAt: c.expiresAt?.toISOString() ?? null,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    }))

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
    const body = (await request.json()) as {
      code?: string
      discountType?: DiscountType
      discountValue?: number
      minOrderValue?: number
      maxUses?: number
      expiresAt?: string | null
      isActive?: boolean
    }

    if (!body.code?.trim() || !body.discountType || !body.discountValue || body.discountValue <= 0) {
      return NextResponse.json({ success: false, error: 'code, discountType, discountValue required' }, { status: 400 })
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: body.code.trim().toUpperCase(),
        discountType: body.discountType,
        discountValue: body.discountValue,
        minOrderValue: body.minOrderValue ?? 0,
        maxUses: body.maxUses ?? 100,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: body.isActive ?? true,
      },
    })

    return NextResponse.json({ success: true, data: coupon }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
