import Link from 'next/link'
import { getOrderAction } from '@/actions/orders'
import { OrderTracker } from '@/components/orders/OrderTracker'
import { TrackingMap } from '@/components/orders/TrackingMap'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderPage({ params }: Props) {
  const { id } = await params
  const order = await getOrderAction(id)

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-gray-600">Order not found or login required</p>
        <Link href="/login" className="mt-4 text-rabbit-600">
          Log in
        </Link>
      </div>
    )
  }

  const showLiveMap = order.status !== 'CANCELLED' && order.status !== 'DELIVERED'

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/shops" className="inline-flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="mt-4 text-xl font-bold">Order {order.orderNumber}</h1>
      <p className="text-sm text-gray-500">{order.shop.name}</p>

      {showLiveMap && (
        <section className="mt-6">
          <TrackingMap
            orderId={order.id}
            initialStatus={order.status}
            destLat={order.destLatitude ?? order.shop.latitude}
            destLng={order.destLongitude ?? order.shop.longitude}
            shopLat={order.shop.latitude}
            shopLng={order.shop.longitude}
          />
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 font-semibold">Track order</h2>
        <OrderTracker
          currentStatus={order.status}
          history={order.statusHistory.map((h) => ({
            status: h.status,
            createdAt: h.createdAt.toISOString(),
            note: h.note,
          }))}
        />
      </section>

      <section className="mt-4 rounded-2xl border border-gray-200 p-4">
        <h3 className="font-semibold">Items</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>
                {i.name} × {i.quantity}
              </span>
              <span>{formatCurrency(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t pt-3 font-bold">
          <span>Total</span>
          <span>{formatCurrency(order.totalPrice + order.deliveryFee)}</span>
        </div>
      </section>
    </div>
  )
}
