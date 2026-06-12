import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { DiscountType } from '@rabbit/database'

// MERCHANT DASHBOARD EXPANSION — merchant coupon CRUD
export async function GET() {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await prisma.shop.findFirst({
      where: { ownerId: session.userId },
      select: { id: true },
    })
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 })
    }

    const coupons = await prisma.shopCoupon.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, coupons })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load coupons'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await prisma.shop.findFirst({
      where: { ownerId: session.userId },
      select: { id: true },
    })
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 })
    }

    const body = await request.json()
    const code = String(body.code ?? '').trim().toUpperCase()
    const offerType = String(body.offerType ?? 'FLAT') as 'FLAT' | 'PERCENT' | 'FREE_DELIVERY'
    const discountValue = Number(body.discountValue ?? 0)
    const minOrderValue = Number(body.minOrderValue ?? 0)
    const maxUses = Number(body.maxUses ?? 100)
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

    if (!code || code.length < 4) {
      return NextResponse.json({ success: false, error: 'Invalid coupon code' }, { status: 400 })
    }

    const discountType: DiscountType = offerType === 'PERCENT' ? 'PERCENT' : 'FLAT'
    const value = offerType === 'FREE_DELIVERY' ? 0 : discountValue

    const coupon = await prisma.shopCoupon.create({
      data: {
        shopId: shop.id,
        code,
        discountType,
        discountValue: value,
        minOrderValue,
        maxUses,
        expiresAt,
      },
    })

    return NextResponse.json({ success: true, coupon }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create coupon'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
