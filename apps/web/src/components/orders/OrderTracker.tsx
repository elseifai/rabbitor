'use client'

import { CUSTOMER_TRACK_STEPS, ORDER_STATUS_LABELS } from '@/lib/order-pipeline'
import type { OrderStatus } from '@rabbit/database'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export function OrderTracker({
  currentStatus,
  history,
}: {
  currentStatus: OrderStatus
  history: { status: OrderStatus; createdAt: string; note: string | null }[]
}) {
  const currentIdx = CUSTOMER_TRACK_STEPS.indexOf(currentStatus)
  const isCancelled = currentStatus === 'CANCELLED'

  if (isCancelled) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        {ORDER_STATUS_LABELS[currentStatus]}
      </div>
    )
  }

  return (
    <ol className="space-y-0">
      {CUSTOMER_TRACK_STEPS.map((step, idx) => {
        const done = idx <= currentIdx
        const event = history.find((h) => h.status === step)
        return (
          <li key={step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold', done ? 'border-rabbit-600 bg-rabbit-600 text-white' : 'border-gray-200 text-gray-400')}>
                {done ? <Check className="h-4 w-4" /> : idx + 1}
              </span>
              {idx < CUSTOMER_TRACK_STEPS.length - 1 && (
                <div className={cn('w-0.5 flex-1 min-h-[2rem]', done ? 'bg-rabbit-600' : 'bg-gray-200')} />
              )}
            </div>
            <div className="pb-8">
              <p className={done ? 'text-gray-900' : 'text-gray-400'}>{ORDER_STATUS_LABELS[step]}</p>
              {event && <p className="text-xs text-gray-500">{new Date(event.createdAt).toLocaleString('en-IN')}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
