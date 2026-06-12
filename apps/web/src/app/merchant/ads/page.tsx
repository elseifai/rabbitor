'use client'

import { RoleGate } from '@/components/auth/RoleGate'
import { MerchantAdsPanel } from '@/components/merchant/MerchantAdsPanel'

// MERCHANT SIDEBAR & CATALOG REFACTOR
export default function MerchantAdsPage() {
  return (
    <RoleGate role="VENDOR" redirectTo="/merchant/login">
      <MerchantAdsPanel />
    </RoleGate>
  )
}
