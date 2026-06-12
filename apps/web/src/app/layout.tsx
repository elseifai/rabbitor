import type { Metadata, Viewport } from 'next'
import { DM_Sans, Outfit } from 'next/font/google'
import { CartProvider } from '@/context/CartContext'
import { AuthProvider } from '@/context/AuthContext'
import { SocketProvider } from '@/context/SocketContext'
import { FcmInit } from '@/components/FcmInit'
import { SplashGate } from '@/components/SplashGate'
import { SandboxAuthGate } from '@/components/auth/SandboxAuthGate'
import { AppStartupProvider } from '@/components/providers/AppStartupProvider'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Rabbit — Hyperlocal delivery from your neighbourhood shops',
  description:
    'Order groceries, fresh fish, footwear, clothing and more from local kiranas and shops near you. Fast delivery, 0% commission for shops at launch.',
  keywords: ['hyperlocal', 'kirana', 'delivery', 'groceries', 'local shops'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#16a34a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${outfit.variable}`}>
      <body className="min-h-screen font-sans">
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
      </body>
    </html>
  )
}
