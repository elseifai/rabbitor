const SOCKET_SERVER_URL =
  process.env.SOCKET_BROADCAST_URL ??
  process.env.NEXT_PUBLIC_SOCKET_SERVER_URL ??
  'http://localhost:4000'

export async function broadcastOrderEvent(
  orderId: string,
  event:
    | { type: 'status'; status: string }
    | { type: 'location'; lat: number; lng: number },
): Promise<void> {
  try {
    await fetch(`${SOCKET_SERVER_URL}/api/v1/internal/order-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, ...event }),
    })
  } catch {
    // Realtime server may be offline during local dev
  }
}
