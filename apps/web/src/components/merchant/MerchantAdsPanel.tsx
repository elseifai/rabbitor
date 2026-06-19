'use client'

import { useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { AdPlansDeck } from '@/components/merchant/ad-plans-deck'

export function MerchantAdsPanel() {
  const searchParams = useSearchParams()
  const activatedPlan = searchParams.get('activated')

  return (
    <div className="space-y-8">
      <AdPlansDeck />

      {activatedPlan && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {activatedPlan} plan activated — your search boost is now live.
        </div>
      )}
    </div>
  )
}
