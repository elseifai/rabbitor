import { DeliveryJobsList, DeliveryZoneBanner } from '@/components/delivery/DeliveryJobsList'
import { getAvailableDeliveryOrdersAction } from '@/actions/delivery'
import { RoleGate } from '@/components/auth/RoleGate'

export default async function DeliveryHomePage() {
  let jobs: Awaited<ReturnType<typeof getAvailableDeliveryOrdersAction>> = []

  try {
    jobs = await getAvailableDeliveryOrdersAction()
  } catch {
    // Delivery partner may not be logged in
  }

  return (
    <RoleGate role="RABBITOR" redirectTo="/auth">
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">You are</p>
          <p className="text-lg font-semibold text-rabbit-400">Available for deliveries</p>
        </div>
        <span className="rounded-full bg-rabbit-600/20 px-3 py-1 text-xs font-semibold text-rabbit-400">
          Online
        </span>
      </div>

      <DeliveryZoneBanner />

      <div>
        <h2 className="mb-3 font-semibold">Available orders</h2>
        <DeliveryJobsList jobs={jobs} />
      </div>
    </div>
    </RoleGate>
  )
}
