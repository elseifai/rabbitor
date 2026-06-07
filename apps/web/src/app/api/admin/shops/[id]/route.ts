import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession(['ADMIN'])
    const { id } = await params
    const body = (await request.json()) as { isActive?: boolean }

    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ success: false, error: 'isActive boolean required' }, { status: 400 })
    }

    const shop = await prisma.shop.update({
      where: { id },
      data: { isActive: body.isActive },
      select: { id: true, name: true, isActive: true },
    })

    return NextResponse.json({ success: true, data: shop })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
