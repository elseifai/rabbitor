import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { AdPlacement } from '@rabbit/database'

// MERCHANT SIDEBAR & CATALOG REFACTOR — store-scoped promotional banners
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

    const ads = await prisma.ad.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, ads })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
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

    const body = (await request.json()) as {
      title?: string
      imageUrl?: string
      linkUrl?: string
      placement?: AdPlacement
    }

    if (!body.title?.trim() || !body.imageUrl?.trim() || !body.placement) {
      return NextResponse.json({ success: false, error: 'title, imageUrl, placement required' }, { status: 400 })
    }

    const ad = await prisma.ad.create({
      data: {
        shopId: shop.id,
        title: body.title.trim(),
        imageUrl: body.imageUrl.trim(),
        linkUrl: body.linkUrl?.trim() || null,
        placement: body.placement,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, ad }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
