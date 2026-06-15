'use client'

import { MapPin, Navigation } from 'lucide-react'
import { DeliveryOrdersPanel } from '@/components/delivery/DeliveryOrdersPanel'

export function DeliveryActiveMapPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-orange-500">Route preview</p>
        <div className="mt-3 flex h-44 items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-gradient-to-br from-orange-50 via-white to-orange-50">
          <div className="text-center">
            <Navigation className="mx-auto h-8 w-8 text-orange-400" />
            <p className="mt-2 text-sm font-semibold text-gray-700">Multi-shop pickup map</p>
            <p className="text-xs text-gray-500">Shop A → Shop B → Customer</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {['Shop A — Sharma Kirana', 'Shop B — Fresh Fish Co.', 'Customer drop-off'].map((stop, i) => (
            <div key={stop} className="flex items-center gap-3 rounded-xl bg-orange-50/50 px-3 py-2 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-white">
                {i + 1}
              </span>
              <span className="font-medium text-gray-800">{stop}</span>
            </div>
          ))}
        </div>
      </div>
      <DeliveryOrdersPanel />
    </div>
  )
}
