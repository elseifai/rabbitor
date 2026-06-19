'use client'

import { useEffect } from 'react'
import { CheckCircle2, MapPin, Package, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type PopupVariant = 'arrived' | 'delivered' | 'picked-up'

const COPY: Record<
  PopupVariant,
  { title: string; subtitle: string; icon: typeof Package; tone: string }
> = {
  arrived: {
    title: 'Rider has arrived!',
    subtitle: 'Your order is at your doorstep',
    icon: MapPin,
    tone: 'from-[#0C831F] to-emerald-500',
  },
  'picked-up': {
    title: 'Order picked up',
    subtitle: 'Your Rabbitor is on the way to you',
    icon: Package,
    tone: 'from-[#FF6B35] to-orange-400',
  },
  delivered: {
    title: 'Order delivered!',
    subtitle: 'Enjoy your order — rate your experience below',
    icon: CheckCircle2,
    tone: 'from-[#0C831F] to-[#0C831F]',
  },
}

export function OrderStatusPopup({
  variant,
  detail,
  onClose,
  autoCloseMs = 6000,
}: {
  variant: PopupVariant
  detail?: string
  onClose: () => void
  autoCloseMs?: number
}) {
  const copy = COPY[variant]
  const Icon = copy.icon

  useEffect(() => {
    if (autoCloseMs <= 0) return
    const id = window.setTimeout(onClose, autoCloseMs)
    return () => window.clearTimeout(id)
  }, [autoCloseMs, onClose])

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl',
          'animate-in slide-in-from-bottom-6 duration-300',
        )}
      >
        <div className={cn('bg-gradient-to-br px-6 py-8 text-white', copy.tone)}>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <Icon className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-center text-xl font-black">{copy.title}</h2>
          <p className="mt-1 text-center text-sm text-white/90">{copy.subtitle}</p>
          {detail && (
            <p className="mt-3 text-center text-xs font-bold text-white/80">{detail}</p>
          )}
        </div>
        <div className="px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
