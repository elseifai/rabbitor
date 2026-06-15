import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(['ADMIN'])
    const { id } = await params
    const body = (await request.json()) as { message?: string }

    if (!body.message?.trim()) {
      return NextResponse.json({ success: false, error: 'Message required' }, { status: 400 })
    }

    const notice = {
      message: body.message.trim(),
      severity: 'warning',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
    }

    await prisma.shop.update({
      where: { id },
      data: { adminNotice: notice },
    })

    return NextResponse.json({ success: true, data: notice, message: 'Broadcast sent to merchant portal' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Broadcast failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
