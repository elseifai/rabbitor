'use client'

import { use } from 'react'
import { CustomerOrderTracking } from '@/components/track/CustomerOrderTracking'

interface Props {
  params: Promise<{ id: string }>
}

export default function StorefrontTrackOrderPage({ params }: Props) {
  const { id } = use(params)
  return <CustomerOrderTracking orderId={id} />
}
