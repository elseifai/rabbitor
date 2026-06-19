const SOCKET_SERVER_URL =
  process.env.SOCKET_BROADCAST_URL ??
  process.env.NEXT_PUBLIC_SOCKET_SERVER_URL ??
  'http://localhost:4000'

const INTERNAL_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  ...(process.env.INTERNAL_API_SECRET
    ? { 'X-Internal-Secret': process.env.INTERNAL_API_SECRET }
    : {}),
}

export async function broadcastOrderEvent(
  orderId: string,
  event:
    | { type: 'status'; status: string }
    | { type: 'location'; lat: number; lng: number },
): Promise<void> {
  try {
    await fetch(`${SOCKET_SERVER_URL}/api/v1/internal/order-events`, {
      method: 'POST',
      headers: INTERNAL_HEADERS,
      body: JSON.stringify({ orderId, ...event }),
    })
  } catch {
    // Realtime server may be offline during local dev
  }
}

export async function broadcastDeliveryOffer(orderId: string): Promise<void> {
  try {
    await fetch(`${SOCKET_SERVER_URL}/api/v1/internal/delivery/offer`, {
      method: 'POST',
      headers: INTERNAL_HEADERS,
      body: JSON.stringify({ orderId }),
    })
  } catch {
    // Realtime server may be offline during local dev
  }
}

/** Assign nearest rider after merchant marks order packed; falls back to broadcast offers. */
export async function broadcastAssignRider(orderId: string): Promise<{ assigned: boolean }> {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/v1/internal/assign-rider`, {
      method: 'POST',
      headers: INTERNAL_HEADERS,
      body: JSON.stringify({ orderId }),
    })
    const json = await res.json().catch(() => ({}))
    return { assigned: Boolean(json?.data?.assigned) }
  } catch {
    return { assigned: false }
  }
}

export async function broadcastFeedbackReceived(payload: {
  orderId: string
  shopId: string
  riderId: string | null
  shopRating: number
  riderRating: number
  comment?: string | null
}): Promise<void> {
  try {
    await fetch(`${SOCKET_SERVER_URL}/api/v1/internal/feedback-received`, {
      method: 'POST',
      headers: INTERNAL_HEADERS,
      body: JSON.stringify(payload),
    })
  } catch {
    /* socket may be offline */
  }
}

export async function broadcastNewMerchantOrder(orderId: string): Promise<void> {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/v1/internal/merchant/new-order`, {
      method: 'POST',
      headers: INTERNAL_HEADERS,
      body: JSON.stringify({ orderId }),
    })
    if (!res.ok) {
      console.error('[order-events] merchant/new-order failed:', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[order-events] merchant/new-order error:', (err as Error).message)
  }
}
