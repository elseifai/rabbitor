'use client'

import { MerchantDashboard } from '@/components/merchant/MerchantDashboard'
import { RoleGate } from '@/components/auth/RoleGate'

export default function MerchantPage() {
  return (
    <RoleGate role="VENDOR" redirectTo="/merchant/login">
      <MerchantDashboard />
    </RoleGate>
  )
}
