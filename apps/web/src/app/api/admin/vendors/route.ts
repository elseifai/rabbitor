import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

export async function GET() {
  try {
    await requireSession(['ADMIN'])

    const vendors = await prisma.vendorProfile.findMany({
      orderBy: { businessName: 'asc' },
      select: {
        id: true,
        businessName: true,
        shops: { select: { id: true, name: true }, take: 1 },
      },
    })

    return NextResponse.json({
      success: true,
      data: vendors.map((v) => ({
        id: v.id,
        businessName: v.businessName,
        shopId: v.shops[0]?.id,
        shopName: v.shops[0]?.name,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
