'use client'

import { usePathname } from 'next/navigation'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'

function isMinimalRoute(pathname: string) {
  if (pathname === '/') return true
  if (pathname.startsWith('/shop/')) return true
  return false
}

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isMinimalRoute(pathname)) {
    return <main>{children}</main>
  }

  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  )
}
