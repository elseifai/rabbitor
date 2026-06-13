'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { SocketProvider } from '@/context/SocketContext'
import { CartProvider } from '@/context/CartContext'
import { SplashGate } from '@/components/SplashGate'
import { SandboxAuthGate } from '@/components/auth/SandboxAuthGate'
import { AppStartupProvider } from '@/components/providers/AppStartupProvider'

const FcmInit = dynamic(
  () => import('@/components/FcmInit').then((mod) => ({ default: mod.FcmInit })),
  { ssr: false },
)

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <CartProvider>
          <SplashGate>
            <SandboxAuthGate>
              <AppStartupProvider>
                <FcmInit />
                {children}
              </AppStartupProvider>
            </SandboxAuthGate>
          </SplashGate>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  )
}
