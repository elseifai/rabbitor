'use client'

import type { OrderStatus } from '@rabbit/database'
import { orderStatusToStepIndex } from '@/lib/tracking-status'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'placed', label: 'Placed', icon: '📋' },
  { key: 'packed', label: 'Packed', icon: '📦' },
  { key: 'delivery', label: 'Out for Delivery', icon: '🛵' },
  { key: 'delivered', label: 'Delivered', icon: '✅' },
] as const

export function TrackingTimeline({ status }: { status: OrderStatus }) {
  const activeIndex = orderStatusToStepIndex(status)
  const cancelled = status === 'CANCELLED'

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, index) => {
          const done = !cancelled && index <= activeIndex
          const current = !cancelled && index === activeIndex

          return (
            <div key={step.key} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors duration-500',
                      done ? 'bg-[#0C831F]' : 'bg-slate-200',
                    )}
                  />
                )}
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base transition-all duration-500',
                    done
                      ? 'bg-[#0C831F] text-white shadow-md shadow-[#0C831F]/25'
                      : 'border-2 border-slate-200 bg-white text-slate-400',
                    current && 'scale-110 ring-4 ring-[#0C831F]/15',
                  )}
                >
                  {step.icon}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors duration-500',
                      index < activeIndex ? 'bg-[#0C831F]' : 'bg-slate-200',
                    )}
                  />
                )}
              </div>
              <p
                className={cn(
                  'mt-2 text-[10px] font-bold leading-tight sm:text-xs',
                  done ? 'text-[#1C1C1C]' : 'text-slate-400',
                )}
              >
                {step.label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
