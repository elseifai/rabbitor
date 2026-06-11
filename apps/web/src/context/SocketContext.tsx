'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { socketClient, type SocketNetworkState } from '@/lib/socket-client'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

type SocketContextValue = SocketNetworkState & {
  unstable: boolean
  dismissNetworkToast: () => void
}

const SocketContext = createContext<SocketContextValue | null>(null)

function SocketNetworkToast({
  visible,
  reconnecting,
}: {
  visible: boolean
  reconnecting: boolean
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed bottom-20 left-1/2 z-[100] w-[min(92vw,22rem)] -translate-x-1/2 transition-all duration-300',
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-3 opacity-0',
      )}
    >
      <div className="flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/95 px-4 py-2.5 text-xs font-semibold text-amber-900 shadow-lg backdrop-blur">
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            reconnecting ? 'animate-pulse bg-amber-500' : 'bg-amber-400',
          )}
        />
        Network unstable. Reconnecting live tracker…
      </div>
    </div>
  )
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [network, setNetwork] = useState<SocketNetworkState>(() => socketClient.getState())
  const [toastVisible, setToastVisible] = useState(false)
  const hadConnectedRef = useRef(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return socketClient.subscribeState(setNetwork)
  }, [])

  useEffect(() => {
    socketClient.updateToken(token)
  }, [token])

  useEffect(() => {
    const purge = () => socketClient.disconnectAndPurge()
    window.addEventListener('rabbit:logout', purge)
    return () => window.removeEventListener('rabbit:logout', purge)
  }, [])

  useEffect(() => {
    if (network.connected) hadConnectedRef.current = true

    const shouldShow =
      socketClient.hasActiveSubscriptions() &&
      hadConnectedRef.current &&
      (network.reconnecting || !network.connected)

    if (shouldShow) {
      setToastVisible(true)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      return
    }

    if (network.connected && toastVisible) {
      toastTimerRef.current = setTimeout(() => setToastVisible(false), 1800)
    }

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [network.connected, network.reconnecting, toastVisible])

  const dismissNetworkToast = useCallback(() => setToastVisible(false), [])

  const unstable =
    socketClient.hasActiveSubscriptions() &&
    hadConnectedRef.current &&
    (network.reconnecting || !network.connected)

  const value = useMemo<SocketContextValue>(
    () => ({
      ...network,
      unstable,
      dismissNetworkToast,
    }),
    [network, unstable, dismissNetworkToast],
  )

  return (
    <SocketContext.Provider value={value}>
      {children}
      <SocketNetworkToast visible={toastVisible && unstable} reconnecting={network.reconnecting} />
    </SocketContext.Provider>
  )
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
