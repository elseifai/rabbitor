'use client'

import { usePathname } from 'next/navigation'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { BottomNav } from '@/components/layout/BottomNav'

function usesBottomNav(pathname: string) {
  if (pathname.startsWith('/merchant') || pathname.startsWith('/admin')) return false
  if (pathname.startsWith('/track')) return false
  if (pathname.startsWith('/checkout')) return false
  return true
}

function usesSiteHeader(pathname: string) {
  return pathname.startsWith('/merchant') || pathname.startsWith('/admin')
}

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showNav = usesBottomNav(pathname)
  const showHeader = usesSiteHeader(pathname)

  return (
    <>
      {showHeader && <SiteHeader />}
      <main className={showNav ? 'pb-20' : undefined}>{children}</main>
      {!showHeader && !showNav && <SiteFooter />}
      {showNav && <BottomNav />}
    </>
  )
}
