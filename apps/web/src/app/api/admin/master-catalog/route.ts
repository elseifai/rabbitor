import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { StoreType } from '@rabbit/database'

// PLATFORM CORE RESOLUTION — global master catalog CRUD for admins
export async function GET(request: Request) {
  try {
    await requireSession(['ADMIN'])

    const { searchParams } = new URL(request.url)
    const storeType = searchParams.get('storeType') as StoreType | null

    const items = await prisma.masterCatalogItem.findMany({
      where: {
        isActive: true,
        ...(storeType ? { storeType } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: items.map((i) => ({
        id: i.id,
        storeType: i.storeType,
        name: i.name,
        description: i.description,
        category: i.category,
        defaultUnit: i.defaultUnit,
        basePrice: i.basePrice,
        imageUrl: i.imageUrl,
        createdAt: i.createdAt.toISOString(),
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
    const body = (await request.json()) as {
      name?: string
      storeType?: StoreType
      category?: string
      basePrice?: number
      description?: string
      defaultUnit?: string
      imageUrl?: string
    }

    if (!body.name?.trim() || !body.basePrice || body.basePrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'name and basePrice are required' },
        { status: 400 },
      )
    }

    const item = await prisma.masterCatalogItem.create({
      data: {
        name: body.name.trim(),
        storeType: body.storeType ?? 'GENERAL',
        category: body.category?.trim() || 'general',
        basePrice: body.basePrice,
        description: body.description?.trim() || null,
        defaultUnit: body.defaultUnit?.trim() || 'piece',
        imageUrl: body.imageUrl?.trim() || null,
      },
    })

    return NextResponse.json({ success: true, data: item }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
