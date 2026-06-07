import { io, type Socket } from 'socket.io-client'
import { getSocketUrl } from './api'
import { getToken } from './auth'

let socket: Socket | null = null
let activeOrderId: string | null = null

async function ensureSocket(): Promise<Socket> {
  if (socket?.connected) return socket
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')

  socket = io(getSocketUrl(), {
    auth: { token },
    transports: ['websocket'],
  })

  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket init failed'))
    socket.once('connect', () => resolve(socket!))
    socket.once('connect_error', reject)
  })
}

export async function joinOrderRoom(orderId: string): Promise<void> {
  const s = await ensureSocket()
  activeOrderId = orderId
  s.emit('join-order-room', { orderId })
}

export async function leaveOrderRoom(orderId: string): Promise<void> {
  if (!socket) return
  socket.emit('leave-order-room', { orderId })
  if (activeOrderId === orderId) activeOrderId = null
}

export async function broadcastLocation(
  orderId: string,
  lat: number,
  lng: number,
): Promise<void> {
  const s = await ensureSocket()
  s.emit('update-live-location', { orderId, lat, lng })
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    activeOrderId = null
  }
}

export function getActiveOrderId(): string | null {
  return activeOrderId
}

export async function setActiveOrderForBackground(orderId: string | null): Promise<void> {
  activeOrderId = orderId
}
