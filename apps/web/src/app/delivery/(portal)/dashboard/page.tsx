import { DeliveryJobsConsole, DeliveryOnlineBanner } from '@/components/delivery/DeliveryJobsConsole'
import { getAvailableDeliveryOrdersAction } from '@/actions/delivery'

export default async function DeliveryDashboardPage() {
  let jobs: Awaited<ReturnType<typeof getAvailableDeliveryOrdersAction>> = []

  try {
    jobs = await getAvailableDeliveryOrdersAction()
  } catch {
    jobs = []
  }

  return (
    <div className="space-y-5">
      <DeliveryOnlineBanner />
      <div>
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">Available jobs</h2>
        <DeliveryJobsConsole jobs={jobs} />
      </div>
    </div>
  )
}
