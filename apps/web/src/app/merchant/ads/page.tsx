'use client'

import { Suspense } from 'react'
import { RoleGate } from '@/components/auth/RoleGate'
import { MerchantAdsPanel } from '@/components/merchant/MerchantAdsPanel'
import { Loader2 } from 'lucide-react'

export default function MerchantAdsPage() {
  return (
    <RoleGate role="VENDOR" redirectTo="/merchant/login">
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
          </div>
        }
      >
        <MerchantAdsPanel />
      </Suspense>
    </RoleGate>
  )
}
