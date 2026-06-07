import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { AdPlacement } from '@rabbit/database'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const placement = searchParams.get('placement') as AdPlacement | null

    if (!placement) {
      return NextResponse.json(
        { success: false, error: 'placement query param required' },
        { status: 400 },
      )
    }

    const now = new Date()
    const ads = await prisma.ad.findMany({
      where: {
        placement,
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })

    if (ads.length > 0) {
      await prisma.ad.updateMany({
        where: { id: { in: ads.map((a) => a.id) } },
        data: { impressions: { increment: 1 } },
      })
    }

    return NextResponse.json({ success: true, data: ads })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch ads'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireSession(['ADMIN'])
    const body = await request.json()
    const { title, imageUrl, linkUrl, placement, isActive, startDate, endDate } = body as {
      title: string
      imageUrl: string
      linkUrl?: string
      placement: AdPlacement
      isActive?: boolean
      startDate?: string
      endDate?: string | null
    }

    if (!title || !imageUrl || !placement) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const ad = await prisma.ad.create({
      data: {
        title,
        imageUrl,
        linkUrl: linkUrl ?? null,
        placement,
        isActive: isActive ?? true,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
      },
    })

    return NextResponse.json({ success: true, data: ad }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create ad'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
