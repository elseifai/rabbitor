'use client'

import { io, type Socket } from 'socket.io-client'
import { getSession } from '@/lib/session'

const CONFIGURED_SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_SERVER_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000'

/** Use same-origin when build-time URL points at localhost but app runs on a public domain. */
export function resolveSocketUrl(): string {
  if (typeof window === 'undefined') return CONFIGURED_SOCKET_URL
  const isLocalConfig = /localhost|127\.0\.0\.1/.test(CONFIGURED_SOCKET_URL)
  const isLocalPage = /localhost|127\.0\.0\.1/.test(window.location.hostname)
  if (isLocalConfig && !isLocalPage) return window.location.origin
  return CONFIGURED_SOCKET_URL
}

export const SOCKET_URL = CONFIGURED_SOCKET_URL

const IDLE_DISCONNECT_MS = 1500

export type SocketNetworkState = {
  connected: boolean
  reconnecting: boolean
  latencyMs: number | null
}

type StateListener = (state: SocketNetworkState) => void
type EventHandler = (...args: unknown[]) => void
type Release = () => void

class SocketClientManager {
  private socket: Socket | null = null
  private token: string | null = null
  private consumerCount = 0
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private orderRooms = new Map<string, number>()
  private storeRooms = new Map<string, number>()
  private riderRoomRefs = 0
  private handlers = new Map<string, Map<symbol, EventHandler>>()
  private stateListeners = new Set<StateListener>()
  private state: SocketNetworkState = {
    connected: false,
    reconnecting: false,
    latencyMs: null,
  }
  private lifecycleBound = false

  subscribeState(listener: StateListener): Release {
    this.stateListeners.add(listener)
    listener(this.getState())
    return () => this.stateListeners.delete(listener)
  }

  getState(): SocketNetworkState {
    return { ...this.state }
  }

  hasActiveSubscriptions(): boolean {
    return (
      this.consumerCount > 0 ||
      this.orderRooms.size > 0 ||
      this.storeRooms.size > 0 ||
      this.riderRoomRefs > 0
    )
  }

  private patchState(patch: Partial<SocketNetworkState>) {
    this.state = { ...this.state, ...patch }
    for (const listener of this.stateListeners) listener(this.getState())
  }

  private clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
  }

  private scheduleIdleDisconnect() {
    this.clearIdleTimer()
    if (this.hasActiveSubscriptions()) return

    this.idleTimer = setTimeout(() => {
      if (!this.hasActiveSubscriptions()) this.disconnectAndPurge()
    }, IDLE_DISCONNECT_MS)
  }

  updateToken(token: string | null) {
    if (this.token === token) return
    this.token = token

    if (!this.socket) return

    this.socket.auth = token ? { token } : {}
    if (this.socket.connected) {
      this.socket.disconnect()
      this.socket.connect()
    }
  }

  /** Hold the shared connection open while a consumer is mounted. */
  acquire(options?: { token?: string | null }): Release {
    if (typeof window === 'undefined') return () => undefined

    const token = options?.token ?? getSession()?.token ?? null
    this.updateToken(token)
    this.consumerCount += 1
    this.clearIdleTimer()
    this.ensureSocket()

    return () => {
      this.consumerCount = Math.max(0, this.consumerCount - 1)
      if (!this.hasActiveSubscriptions()) this.scheduleIdleDisconnect()
    }
  }

  acquireOrderRoom(orderId: string, options?: { token?: string | null }): Release {
    const releaseConnection = this.acquire(options)
    const releaseRoom = this.joinOrderRoom(orderId)
    return () => {
      releaseRoom()
      releaseConnection()
    }
  }

  acquireStoreRoom(storeId: string, options?: { token?: string | null }): Release {
    const releaseConnection = this.acquire(options)
    const releaseRoom = this.joinStoreRoom(storeId)
    return () => {
      releaseRoom()
      releaseConnection()
    }
  }

  acquireRiderRoom(options?: { token?: string | null }): Release {
    const releaseConnection = this.acquire(options)
    const releaseRoom = this.joinRiderRoom()
    return () => {
      releaseRoom()
      releaseConnection()
    }
  }

  private joinOrderRoom(orderId: string): Release {
    const next = (this.orderRooms.get(orderId) ?? 0) + 1
    this.orderRooms.set(orderId, next)

    if (next === 1) {
      this.emitWhenConnected('join-order-room', { orderId })
    }

    return () => this.leaveOrderRoom(orderId)
  }

  private leaveOrderRoom(orderId: string) {
    const current = this.orderRooms.get(orderId) ?? 0
    if (current <= 1) {
      this.orderRooms.delete(orderId)
      this.socket?.emit('leave-order-room', { orderId })
    } else {
      this.orderRooms.set(orderId, current - 1)
    }
  }

  private joinStoreRoom(storeId: string): Release {
    const next = (this.storeRooms.get(storeId) ?? 0) + 1
    this.storeRooms.set(storeId, next)

    if (next === 1) {
      this.emitWhenConnected('join-store-room', { storeId })
    }

    return () => this.leaveStoreRoom(storeId)
  }

  private leaveStoreRoom(storeId: string) {
    const current = this.storeRooms.get(storeId) ?? 0
    if (current <= 1) {
      this.storeRooms.delete(storeId)
      this.socket?.emit('leave-store-room', { storeId })
    } else {
      this.storeRooms.set(storeId, current - 1)
    }
  }

  private joinRiderRoom(): Release {
    this.riderRoomRefs += 1
    if (this.riderRoomRefs === 1) {
      this.emitWhenConnected('join-rider-room')
    }

    return () => {
      if (this.riderRoomRefs <= 1) {
        this.riderRoomRefs = 0
        this.socket?.emit('leave-rider-room')
      } else {
        this.riderRoomRefs -= 1
      }
    }
  }

  private emitWhenConnected(event: string, payload?: unknown) {
    this.ensureSocket()
    const client = this.socket
    if (!client) return

    const emit = () => {
      if (payload === undefined) client.emit(event)
      else client.emit(event, payload)
    }

    if (client.connected) emit()
    else client.once('connect', emit)
  }

  on<T extends unknown[]>(event: string, handler: (...args: T) => void): Release {
    this.ensureSocket()
    const client = this.socket
    if (!client) return () => undefined

    const id = Symbol(event)
    const wrapper: EventHandler = (...args) => handler(...(args as T))

    if (!this.handlers.has(event)) this.handlers.set(event, new Map())
    this.handlers.get(event)!.set(id, wrapper)
    client.on(event, wrapper)

    return () => {
      client.off(event, wrapper)
      this.handlers.get(event)?.delete(id)
    }
  }

  emit(event: string, payload?: unknown) {
    this.ensureSocket()
    if (!this.socket?.connected) return
    if (payload === undefined) this.socket.emit(event)
    else this.socket.emit(event, payload)
  }

  getSocket(): Socket | null {
    return this.socket
  }

  purgeAllRooms() {
    for (const orderId of this.orderRooms.keys()) {
      this.socket?.emit('leave-order-room', { orderId })
    }
    for (const storeId of this.storeRooms.keys()) {
      this.socket?.emit('leave-store-room', { storeId })
    }
    if (this.riderRoomRefs > 0) {
      this.socket?.emit('leave-rider-room')
    }

    this.orderRooms.clear()
    this.storeRooms.clear()
    this.riderRoomRefs = 0
  }

  private detachHandlers() {
    if (!this.socket) return

    for (const [event, handlerMap] of this.handlers) {
      for (const handler of handlerMap.values()) {
        this.socket.off(event, handler)
      }
    }
    this.handlers.clear()
  }

  disconnectAndPurge() {
    if (typeof window === 'undefined') return

    this.clearIdleTimer()
    this.consumerCount = 0
    this.purgeAllRooms()
    this.detachHandlers()

    if (this.socket) {
      this.socket.io.off('reconnect_attempt')
      this.socket.io.off('reconnect')
      this.socket.io.off('reconnect_failed')
      this.socket.off('connect')
      this.socket.off('disconnect')
      this.socket.off('connect_error')

      const engine = this.socket.io.engine
      if (engine) {
        engine.off('ping')
        engine.off('pong')
      }

      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }

    this.lifecycleBound = false
    this.patchState({ connected: false, reconnecting: false, latencyMs: null })
  }

  private ensureSocket() {
    if (typeof window === 'undefined') return

    if (!this.socket) {
      const token = this.token ?? getSession()?.token ?? null
      this.token = token

      this.socket = io(resolveSocketUrl(), {
        autoConnect: false,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        auth: token ? { token } : {},
      })

      this.bindLifecycle()
    }

    if (!this.socket.connected && !this.socket.active) {
      this.socket.connect()
    }
  }

  private bindLifecycle() {
    if (!this.socket || this.lifecycleBound) return
    this.lifecycleBound = true

    const client = this.socket
    const manager = client.io

    const onConnect = () => {
      this.patchState({ connected: true, reconnecting: false })
      this.rejoinActiveRooms()
    }

    const onDisconnect = () => {
      this.patchState({ connected: false })
    }

    const onReconnectAttempt = () => {
      this.patchState({ reconnecting: true, connected: false })
    }

    const onReconnect = () => {
      this.patchState({ connected: true, reconnecting: false })
      this.rejoinActiveRooms()
    }

    const onReconnectFailed = () => {
      this.patchState({ reconnecting: false, connected: false })
    }

    client.on('connect', onConnect)
    client.on('disconnect', onDisconnect)
    client.on('connect_error', onDisconnect)
    manager.on('reconnect_attempt', onReconnectAttempt)
    manager.on('reconnect', onReconnect)
    manager.on('reconnect_failed', onReconnectFailed)

    const engine = manager.engine
    if (engine) {
      let pingAt = 0
      engine.on('ping', () => {
        pingAt = Date.now()
      })
      engine.on('pong', () => {
        if (pingAt > 0) {
          this.patchState({ latencyMs: Date.now() - pingAt })
        }
      })
    }

    if (client.connected) onConnect()
  }

  private rejoinActiveRooms() {
    if (!this.socket?.connected) return

    for (const orderId of this.orderRooms.keys()) {
      this.socket.emit('join-order-room', { orderId })
    }
    for (const storeId of this.storeRooms.keys()) {
      this.socket.emit('join-store-room', { storeId })
    }
    if (this.riderRoomRefs > 0) {
      this.socket.emit('join-rider-room')
    }
  }
}

export const socketClient = new SocketClientManager()
