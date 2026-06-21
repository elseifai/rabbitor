import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { StoreType } from '@rabbit/database'

// PLATFORM CORE RESOLUTION — bulk master catalog insert
export async function POST(request: Request) {
  try {
    await requireSession(['ADMIN'])
    const body = (await request.json()) as {
      items?: {
        name: string
        storeType?: StoreType
        category?: string
        basePrice: number
        defaultUnit?: string
        description?: string
        imageUrl?: string
      }[]
    }

    if (!body.items?.length) {
      return NextResponse.json({ success: false, error: 'items array required' }, { status: 400 })
    }

    const created = await prisma.$transaction(
      body.items.map((item) =>
        prisma.masterCatalogItem.create({
          data: {
            name: item.name.trim(),
            storeType: item.storeType ?? 'GENERAL',
            segmentSlug: item.category?.trim() || 'general',
            basePrice: item.basePrice,
            defaultUnit: item.defaultUnit?.trim() || 'piece',
            description: item.description?.trim() || null,
            imageUrl: item.imageUrl?.trim() || null,
          },
        }),
      ),
    )

    return NextResponse.json({ success: true, count: created.length, data: created })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
