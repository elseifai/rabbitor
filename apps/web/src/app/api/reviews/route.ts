import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'

/** Stub review endpoint — persists nothing yet. */
export async function POST(request: Request) {
  try {
    await requireSession(['CUSTOMER'])
    const body = await request.json()
    const { orderId, shopRating, riderRating, comment } = body as {
      orderId?: string
      shopRating?: number
      riderRating?: number
      comment?: string
    }

    if (!orderId || !shopRating || !riderRating) {
      return NextResponse.json(
        { success: false, error: 'orderId, shopRating and riderRating required' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { orderId, shopRating, riderRating, comment: comment ?? null },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Review failed'
    const code = /log in/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
