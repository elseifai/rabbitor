import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getActiveDeliveryAction } from '@/actions/delivery'
import { LiveLocationBroadcaster } from '@/components/delivery/LiveLocationBroadcaster'
import type { OrderStatus } from '@rabbit/database'
import { ORDER_STATUS_LABELS } from '@/lib/order-pipeline'

interface Props {
  searchParams: Promise<{ orderId?: string }>
}

// PLATFORM CORE RESOLUTION — white & orange navigate view
export default async function DeliveryNavigatePage({ searchParams }: Props) {
  const { orderId: queryOrderId } = await searchParams

  let activeOrder
  try {
    activeOrder = await getActiveDeliveryAction()
  } catch {
    return (
      <div className="space-y-4 pb-24 text-center">
        <p className="text-gray-500">Log in as a delivery partner to start navigating.</p>
        <Link href="/auth" className="text-orange-500 hover:underline">
          Log in
        </Link>
      </div>
    )
  }

  const orderId = queryOrderId ?? activeOrder?.id

  if (!orderId || !activeOrder || activeOrder.id !== orderId) {
    redirect('/delivery')
  }

  return (
    <div className="space-y-6 pb-24">
      <Link href="/delivery" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange-500">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>

      <div>
        <p className="text-xs uppercase tracking-wide text-orange-500">Active delivery</p>
        <h2 className="text-xl font-bold text-gray-900">{activeOrder.orderNumber}</h2>
        <p className="mt-1 text-sm text-gray-500">{activeOrder.shopName}</p>
        <p className="mt-2 text-xs text-gray-400">
          {ORDER_STATUS_LABELS[activeOrder.status as OrderStatus]}
        </p>
      </div>

      <LiveLocationBroadcaster
        orderId={orderId}
        destLat={activeOrder.destLat ?? activeOrder.shopLat}
        destLng={activeOrder.destLng ?? activeOrder.shopLng}
      />

      <div className="rounded-2xl border border-orange-100 bg-white p-4 text-sm">
        <p className="font-medium text-gray-900">Pickup</p>
        <p className="mt-1 text-gray-500">{activeOrder.shopAddress}</p>
        <p className="mt-4 font-medium text-gray-900">Drop-off</p>
        <p className="mt-1 text-gray-500">{activeOrder.deliveryAddress}</p>
      </div>
    </div>
  )
}
