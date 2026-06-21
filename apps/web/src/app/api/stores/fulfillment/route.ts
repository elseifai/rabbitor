/**
 * Store Fulfillment Check API
 *
 * POST /api/stores/fulfillment
 */

import { NextRequest, NextResponse } from 'next/server'
import { rankFulfillmentStores, type FulfillmentStore } from '@/lib/store-fulfillment'

export type { FulfillmentStore }

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      items?: Array<{ productId: string; quantity: number }>
      lat?: number
      lng?: number
      radiusKm?: number
    }

    const { items, lat = 19.1364, lng = 72.8296, radiusKm = 25 } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart items are required' },
        { status: 400 },
      )
    }

    const results = await rankFulfillmentStores({ items, lat, lng, radiusKm })

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fulfillment check failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
