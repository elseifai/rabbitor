'use client'

import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

type OrderSuccessScreenProps = {
  orderNumber?: string | null
  /** Called after the success animation hold (default ~1.8s). */
  onComplete: () => void
  holdMs?: number
}

/** DEV SANDBOX REFACTOR — full-screen order confirmation tick before tracking redirect. */
export function OrderSuccessScreen({
  orderNumber,
  onComplete,
  holdMs = 1800,
}: OrderSuccessScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, holdMs)
    return () => window.clearTimeout(timer)
  }, [holdMs, onComplete])

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[#F8FAFC] px-6 text-center font-sans">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full bg-[#0C831F]/15 animate-order-success-ping motion-reduce:animate-none"
          aria-hidden
        />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#0C831F] shadow-lg shadow-[#0C831F]/30 animate-order-success-pop motion-reduce:animate-none">
          <CheckCircle2 className="h-14 w-14 text-white" strokeWidth={2.5} />
        </div>
      </div>

      <h1 className="mt-8 text-2xl font-black text-slate-900 animate-order-success-fade motion-reduce:animate-none">
        Order placed!
      </h1>
      {orderNumber && (
        <p className="mt-2 text-sm font-bold text-[#FF6B35]">#{orderNumber}</p>
      )}
      <p className="mt-2 text-sm text-slate-500">Taking you to live tracking…</p>
    </div>
  )
}
