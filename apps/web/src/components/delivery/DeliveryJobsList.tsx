'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { MapPin, Clock, IndianRupee, CheckCircle2, Navigation } from 'lucide-react'
import { acceptDeliveryOrderAction } from '@/actions/delivery'
import type { OrderStatus } from '@rabbit/database'

type DeliveryJob = {
  id: string
  orderNumber: string
  status: OrderStatus
  shopName: string
  deliveryFee: number
  itemCount: number
  isAssigned: boolean
}

// PLATFORM CORE RESOLUTION — white & orange delivery job cards
export function DeliveryJobsList({ jobs }: { jobs: DeliveryJob[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleAccept(orderId: string) {
    startTransition(async () => {
      const result = await acceptDeliveryOrderAction(orderId)
      if (result.ok) {
        router.push(`/delivery/navigate?orderId=${orderId}`)
      }
    })
  }

  if (jobs.length === 0) {
    return (
      <p className="rounded-2xl border border-orange-100 bg-orange-50/30 p-6 text-center text-sm text-gray-500">
        No delivery jobs right now. Check back when a shop marks an order ready.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-900">{job.shopName}</p>
              <p className="mt-1 text-xs text-gray-500">
                {job.orderNumber} · {job.itemCount} items · {job.status.replace(/_/g, ' ').toLowerCase()}
              </p>
            </div>
            <span className="flex items-center gap-0.5 font-bold text-orange-500">
              <IndianRupee className="h-3.5 w-3.5" />
              {job.deliveryFee}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              {job.isAssigned ? 'Assigned to you' : 'Available'}
            </span>
            {job.isAssigned ? (
              <button
                type="button"
                onClick={() => router.push(`/delivery/navigate?orderId=${job.id}`)}
                className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                <Navigation className="h-4 w-4" />
                Navigate
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleAccept(job.id)}
                className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                Accept
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DeliveryZoneBanner() {
  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <MapPin className="h-4 w-4 text-orange-500" />
        Live GPS tracking enabled — customers see your position on the map
      </div>
    </div>
  )
}
