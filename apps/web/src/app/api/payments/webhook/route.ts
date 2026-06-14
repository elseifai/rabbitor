import { NextResponse } from 'next/server'
import {
  handleRazorpayWebhookEvent,
  verifyRazorpayWebhookSignature,
} from '@/lib/payment-intent-server'

export async function POST(request: Request) {
  try {
    const bodyText = await request.text()
    const signature = request.headers.get('x-razorpay-signature') ?? ''

    if (!verifyRazorpayWebhookSignature(bodyText, signature)) {
      return NextResponse.json({ success: false, error: 'Invalid webhook signature' }, { status: 401 })
    }

    const payload = JSON.parse(bodyText) as {
      event?: string
      payload?: Record<string, unknown>
    }

    if (!payload.event) {
      return NextResponse.json({ success: false, error: 'Missing event' }, { status: 400 })
    }

    const result = await handleRazorpayWebhookEvent(payload.event, payload.payload ?? {})

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
