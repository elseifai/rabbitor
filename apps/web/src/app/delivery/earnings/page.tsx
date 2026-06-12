import { IndianRupee } from 'lucide-react'

// PLATFORM CORE RESOLUTION — white & orange earnings view
export default function DeliveryEarningsPage() {
  return (
    <div className="space-y-6 pb-24">
      <div className="rounded-2xl border border-orange-100 bg-orange-50/30 p-5">
        <p className="text-sm text-gray-500">This week</p>
        <p className="text-3xl font-bold text-orange-500">
          <span className="inline-flex items-center">
            <IndianRupee className="h-7 w-7" />
            0
          </span>
        </p>
      </div>
      <p className="text-sm text-gray-500">
        Earnings summary will appear here after completed deliveries.
      </p>
    </div>
  )
}
