'use client'

import { RoleGate } from '@/components/auth/RoleGate'
import { MerchantCouponsPanel } from '@/components/merchant/MerchantCouponsPanel'

// MERCHANT SIDEBAR & CATALOG REFACTOR
export default function MerchantCouponsPage() {
  return (
    <RoleGate role="VENDOR" redirectTo="/merchant/login">
      <MerchantCouponsPanel />
    </RoleGate>
  )
}
