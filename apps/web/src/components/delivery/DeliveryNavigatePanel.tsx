'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, MessageSquare, Phone } from 'lucide-react'
import { getActiveDeliveryAction, type ActiveDelivery } from '@/actions/delivery'

export function DeliveryNavigatePanel() {
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<ActiveDelivery | null>(null)

  useEffect(() => {
    void getActiveDeliveryAction().then((delivery) => {
      setActive(delivery)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!active) {
    return (
      <div className="rounded-3xl border border-orange-100 bg-orange-50/30 p-8 text-center">
        <p className="font-semibold text-gray-800">No active delivery</p>
        <p className="mt-1 text-sm text-gray-500">Accept a job from the Jobs tab first.</p>
        <Link href="/delivery/dashboard" className="mt-4 inline-block text-sm font-bold text-orange-500">
          ← Back to jobs
        </Link>
      </div>
    )
  }

  const instructions = parseInstructions(active)

  return (
    <div className="space-y-5 pb-24">
      <Link href="/delivery/orders" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange-500">
        <ArrowLeft className="h-4 w-4" /> Active delivery
      </Link>

      <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-orange-500">Customer dispatch</p>
        <h2 className="mt-1 text-xl font-black text-gray-900">{active.orderNumber}</h2>
        <p className="mt-1 text-sm text-gray-500">{active.shopName}</p>
      </div>

      <div className="rounded-3xl border border-orange-100 bg-orange-50/40 p-5">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-0.5 h-5 w-5 text-orange-500" />
          <div>
            <p className="text-sm font-bold text-gray-900">Delivery instructions</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {instructions.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-orange-100 bg-white p-5">
        <p className="text-xs font-bold uppercase text-gray-500">Drop-off address</p>
        <p className="mt-2 text-sm text-gray-800">{active.deliveryAddress}</p>
        <a
          href={active.customerPhone ? `tel:+91${active.customerPhone}` : 'tel:+919876543210'}
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 text-sm font-bold text-white"
        >
          <Phone className="h-4 w-4" />
          Call customer
        </a>
      </div>
    </div>
  )
}

function parseInstructions(active: { deliveryInstruction?: string | null; deliveryAddress: string }): string[] {
  if (active.deliveryInstruction?.trim()) {
    return active.deliveryInstruction
      .split(/[.;|\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  const defaults = ['Leave at gate if unavailable', "Don't ring the bell", 'Call on arrival']
  if (active.deliveryAddress.toLowerCase().includes('gate')) {
    return ['Leave at gate', "Don't ring bell", 'Share photo after drop-off']
  }
  return defaults
}
