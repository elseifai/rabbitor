import { LiveTrackingView } from '@/components/track/LiveTrackingView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LiveTrackingPage({ params }: Props) {
  const { id } = await params
  return <LiveTrackingView orderId={id} />
}
