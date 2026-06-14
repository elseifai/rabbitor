import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { paymentMethod } = body as { paymentMethod?: string }

    if (paymentMethod === 'cod') {
      return NextResponse.json(
        { success: false, error: 'Cash on delivery is not available. Please pay online at checkout.' },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Orders must be placed through prepaid checkout. Pay online to confirm your order.',
      },
      { status: 403 },
    )
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Order creation failed'
    const message = raw.includes('Foreign key constraint')
      ? 'Your session expired. Please log in again to place an order.'
      : raw
    const status = message.includes('log in again') ? 401 : 500
    if (status === 401) await clearSession().catch(() => {})
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
