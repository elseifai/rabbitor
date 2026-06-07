import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { handleServerError } from '@/lib/api-helper'
import { parsePrepMinutes, uniqueShopSlug } from '@/lib/slug'

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=500&q=80'

const DEFAULT_LAT = 19.1364
const DEFAULT_LNG = 72.8296

export async function GET() {
  try {
    await requireSession(['ADMIN'])

    const shops = await prisma.shop.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { phone: true, name: true } },
        _count: { select: { orders: true, products: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: shops.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        storeType: s.storeType,
        category: s.category,
        address: s.address,
        isActive: s.isActive,
        ownerPhone: s.owner.phone,
        ownerName: s.owner.name,
        orderCount: s._count.orders,
        productCount: s._count.products,
        createdAt: s.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}

export async function POST(request: Request) {
  try {
    await requireSession(['ADMIN'])

    const body = await request.json()
    const {
      name,
      cuisine,
      location,
      image,
      time,
      ownerPhone,
      latitude,
      longitude,
      minOrderValue,
      baseDeliveryFee,
    } = body as {
      name?: string
      cuisine?: string
      location?: string
      image?: string
      time?: string
      ownerPhone?: string
      latitude?: number
      longitude?: number
      minOrderValue?: number
      baseDeliveryFee?: number
    }

    if (!name?.trim() || !cuisine?.trim() || !location?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required vendor fields.' },
        { status: 400 },
      )
    }

    let owner = ownerPhone
      ? await prisma.user.findUnique({ where: { phone: ownerPhone.replace(/\D/g, '').slice(-10) } })
      : null

    if (!owner) {
      owner = await prisma.user.findFirst({
        where: { role: 'VENDOR' },
        orderBy: { createdAt: 'asc' },
      })
    }

    if (!owner) {
      return NextResponse.json(
        { success: false, error: 'No merchant account found to assign as shop owner.' },
        { status: 400 },
      )
    }

    const slug = await uniqueShopSlug(name, async (candidate) => {
      const existing = await prisma.shop.findUnique({ where: { slug: candidate } })
      return Boolean(existing)
    })

    const category = cuisine.trim()

    const newShop = await prisma.shop.create({
      data: {
        name: name.trim(),
        slug,
        category,
        address: location.trim(),
        image: image?.trim() || DEFAULT_IMAGE,
        avgPrepMinutes: parsePrepMinutes(time),
        ownerId: owner.id,
        latitude: typeof latitude === 'number' ? latitude : DEFAULT_LAT,
        longitude: typeof longitude === 'number' ? longitude : DEFAULT_LNG,
        minOrderValue: minOrderValue ?? 99,
        baseDeliveryFee: baseDeliveryFee ?? 25,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      shopId: newShop.id,
      slug: newShop.slug,
      productCount: 0,
      shop: {
        id: newShop.id,
        name: newShop.name,
        slug: newShop.slug,
        category: newShop.category,
        address: newShop.address,
        image: newShop.image,
        avgPrepMinutes: newShop.avgPrepMinutes,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vendor onboarding failed'
    if (/log in|access denied/i.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 401 })
    }
    return handleServerError(error, 'admin/shops POST')
  }
}
