'use client'

import { RoleGate } from '@/components/auth/RoleGate'
import { MerchantOrdersPipeline } from '@/components/merchant/MerchantOrdersPipeline'

// MERCHANT SIDEBAR & CATALOG REFACTOR
export default function MerchantOrdersPage() {
  return (
    <RoleGate role="VENDOR" redirectTo="/merchant/login">
      <MerchantOrdersPipeline />
    </RoleGate>
  )
}
