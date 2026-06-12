'use client'

import { RoleGate } from '@/components/auth/RoleGate'
import { MerchantRevenuePanel } from '@/components/merchant/MerchantRevenuePanel'

// MERCHANT SIDEBAR & CATALOG REFACTOR
export default function MerchantRevenuePage() {
  return (
    <RoleGate role="VENDOR" redirectTo="/merchant/login">
      <MerchantRevenuePanel />
    </RoleGate>
  )
}
