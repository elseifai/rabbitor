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
      <p className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-500">
        No delivery jobs right now. Check back when a shop marks an order ready.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{job.shopName}</p>
              <p className="mt-1 text-xs text-gray-500">
                {job.orderNumber} · {job.itemCount} items · {job.status.replace(/_/g, ' ').toLowerCase()}
              </p>
            </div>
            <span className="flex items-center gap-0.5 font-bold text-rabbit-400">
              <IndianRupee className="h-3.5 w-3.5" />
              {job.deliveryFee}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              {job.isAssigned ? 'Assigned to you' : 'Available'}
            </span>
            {job.isAssigned ? (
              <button
                type="button"
                onClick={() => router.push(`/delivery/navigate?orderId=${job.id}`)}
                className="flex items-center gap-1.5 rounded-xl bg-rabbit-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <Navigation className="h-4 w-4" />
                Navigate
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleAccept(job.id)}
                className="flex items-center gap-1.5 rounded-xl bg-rabbit-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <MapPin className="h-4 w-4" />
        Live GPS tracking enabled — customers see your position on the map
      </div>
    </div>
  )
}
