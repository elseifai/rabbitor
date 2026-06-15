'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Clock, IndianRupee, MapPin, Store } from 'lucide-react'
import { acceptDeliveryOrderAction } from '@/actions/delivery'
import { SwipeActionButton } from '@/components/delivery/SwipeActionButton'
import { formatCurrency } from '@/lib/utils'

export type DeliveryJobBundle = {
  id: string
  orderNumber: string
  status: string
  shopName: string
  shops: string[]
  deliveryFee: number
  itemCount: number
  isAssigned: boolean
  isMultiStore: boolean
  legCount: number
  distanceKm: number
  acceptOrderId: string
}

export function DeliveryJobsConsole({ jobs }: { jobs: DeliveryJobBundle[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleAccept(orderId: string) {
    startTransition(async () => {
      const result = await acceptDeliveryOrderAction(orderId)
      if (result.ok) {
        router.push('/delivery/orders')
      }
    })
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/40 p-8 text-center">
        <p className="text-sm font-semibold text-gray-700">No jobs nearby</p>
        <p className="mt-1 text-xs text-gray-500">Stay online — new multi-store routes appear here instantly.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <article
          key={job.id}
          className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm"
        >
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-3 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-100">
                  {job.isMultiStore ? 'Multi-store route' : 'Single pickup'}
                </p>
                <p className="text-lg font-black">{job.orderNumber}</p>
              </div>
              <p className="text-xl font-black">{formatCurrency(job.deliveryFee)}</p>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Store className="h-4 w-4 shrink-0 text-orange-500" />
              <span className="font-semibold">{job.shopName}</span>
            </div>

            {job.isMultiStore && (
              <ol className="ml-6 space-y-1 border-l-2 border-orange-100 pl-3 text-xs text-gray-600">
                {job.shops.map((shop, i) => (
                  <li key={`${job.id}-${i}`}>
                    Stop {i + 1}: {shop}
                  </li>
                ))}
              </ol>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 font-semibold text-orange-700">
                <MapPin className="h-3.5 w-3.5" />
                {job.distanceKm} km
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 font-semibold">
                <Clock className="h-3.5 w-3.5" />
                {job.itemCount} items
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 font-semibold">
                <IndianRupee className="h-3.5 w-3.5" />
                {job.legCount} leg{job.legCount > 1 ? 's' : ''}
              </span>
            </div>

            {job.isAssigned ? (
              <button
                type="button"
                onClick={() => router.push('/delivery/orders')}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-gray-900 text-sm font-bold text-white"
              >
                Continue active job
              </button>
            ) : (
              <SwipeActionButton
                label="Slide to Accept Job"
                tone="orange"
                disabled={pending}
                onConfirm={() => handleAccept(job.acceptOrderId)}
              />
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

export function DeliveryOnlineBanner() {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-orange-500">Duty status</p>
        <p className="text-lg font-black text-gray-900">You&apos;re online</p>
        <p className="text-xs text-gray-500">GPS + live offers enabled</p>
      </div>
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
      </span>
    </div>
  )
}
