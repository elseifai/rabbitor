'use client'

import type { OrderStatus } from '@rabbit/database'
import RabbitRunAnimation from '@/components/RabbitRunAnimation'

const STATUS_PERCENT: Record<OrderStatus, number> = {
  PENDING: 5,
  ACCEPTED_BY_SHOP: 25,
  PREPARING: 50,
  OUT_FOR_DELIVERY: 80,
  DELIVERED: 100,
  CANCELLED: 0,
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Order Placed',
  ACCEPTED_BY_SHOP: 'Shop Accepted',
  PREPARING: 'Being Prepared',
  OUT_FOR_DELIVERY: 'Rabbit on the way 🐰',
  DELIVERED: 'Delivered! 🎉',
  CANCELLED: 'Order Cancelled',
}

export function RabbitProgressTrack({
  status,
  timeLeft,
}: {
  status: OrderStatus
  timeLeft?: number
}) {
  const percent = STATUS_PERCENT[status] ?? 5
  const label = STATUS_LABEL[status] ?? 'Tracking your order…'
  const isDelivered = status === 'DELIVERED'
  const isOutForDelivery = status === 'OUT_FOR_DELIVERY'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-orange-100 bg-white p-5">
      {isDelivered && (
        <div className="confetti-layer pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${(i * 17) % 100}%`,
                animationDelay: `${(i % 8) * 0.12}s`,
                backgroundColor: ['#FF6B35', '#0C831F', '#FFD700', '#FF4081', '#2196F3'][i % 5],
              }}
            />
          ))}
        </div>
      )}

      <RabbitRunAnimation
        percent={percent}
        label={label}
        timeLeft={isDelivered ? undefined : timeLeft}
        animate={isOutForDelivery || isDelivered}
      />
    </div>
  )
}
