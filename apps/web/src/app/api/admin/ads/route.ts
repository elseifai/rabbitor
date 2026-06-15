import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { AdPlacement } from '@rabbit/database'

function parseJsonArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map(String).filter(Boolean)
}

export async function GET() {
  try {
    await requireSession(['ADMIN'])

    const ads = await prisma.ad.findMany({
      orderBy: { createdAt: 'desc' },
      include: { shop: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ success: true, data: ads })
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
      title?: string
      imageUrl?: string
      linkUrl?: string
      placement?: AdPlacement
      isActive?: boolean
      startDate?: string
      endDate?: string | null
      targetZones?: string[]
      targetSegments?: string[]
      targetShopIds?: string[]
    }

    if (!body.title?.trim() || !body.imageUrl?.trim() || !body.placement) {
      return NextResponse.json(
        { success: false, error: 'title, image, and placement are required' },
        { status: 400 },
      )
    }

    const ad = await prisma.ad.create({
      data: {
        title: body.title.trim(),
        imageUrl: body.imageUrl.trim(),
        linkUrl: body.linkUrl?.trim() || null,
        placement: body.placement,
        isActive: body.isActive ?? true,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : null,
        targetZones: parseJsonArray(body.targetZones),
        targetSegments: parseJsonArray(body.targetSegments),
        targetShopIds: parseJsonArray(body.targetShopIds),
      },
    })

    return NextResponse.json({ success: true, data: ad }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
