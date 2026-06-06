import { IndianRupee } from 'lucide-react'

export default function DeliveryEarningsPage() {
  return (
    <div className="space-y-6 pb-24">
      <div>
        <p className="text-sm text-gray-400">This week</p>
        <p className="text-3xl font-bold text-rabbit-400">
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
