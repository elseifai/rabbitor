'use client'

import { useCallback, useEffect, useState } from 'react'
import { getMerchantShopAction, toggleShopOpenAction } from '@/actions/merchant'
import { MerchantLayoutShell } from '@/components/merchant/MerchantLayoutShell'

// MERCHANT SIDEBAR & CATALOG REFACTOR — shared shell with shop context
export function MerchantShellProvider({ children }: { children: React.ReactNode }) {
  const [shopName, setShopName] = useState('Your Store')
  const [shopId, setShopId] = useState<string | null>(null)
  const [shopOpen, setShopOpen] = useState(true)

  const load = useCallback(async () => {
    const shop = await getMerchantShopAction()
    if (shop) {
      setShopName(shop.name)
      setShopId(shop.id)
      setShopOpen(shop.isActive)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggleShop = async () => {
    if (!shopId) return
    const next = !shopOpen
    setShopOpen(next)
    const res = await toggleShopOpenAction(shopId, next)
    if (!res.ok) setShopOpen(!next)
  }

  return (
    <MerchantLayoutShell
      shopName={shopName}
      shopOpen={shopId ? shopOpen : undefined}
      onToggleShop={shopId ? () => void toggleShop() : undefined}
    >
      {children}
    </MerchantLayoutShell>
  )
}
