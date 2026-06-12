import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { StoreType } from '@rabbit/database'

// PLATFORM CORE RESOLUTION — merchant-facing DB master catalog lookup
export async function GET(request: Request) {
  try {
    await requireSession(['VENDOR', 'ADMIN'])
    const { searchParams } = new URL(request.url)
    const storeType = (searchParams.get('storeType') ?? 'GENERAL') as StoreType

    const items = await prisma.masterCatalogItem.findMany({
      where: { isActive: true, storeType },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: items.map((i) => ({
        id: `db-${i.id}`,
        name: i.name,
        description: i.description ?? '',
        category: i.category,
        defaultUnit: i.defaultUnit,
        suggestedPrice: i.basePrice,
        imageUrl: i.imageUrl ?? undefined,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
