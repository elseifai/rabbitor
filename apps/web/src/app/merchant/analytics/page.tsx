import { MerchantAnalyticsClient } from '@/components/merchant/MerchantAnalyticsClient'

export default function MerchantAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
        <p className="text-sm text-gray-500">Orders, revenue, and catalogue performance</p>
      </div>
      <MerchantAnalyticsClient />
    </div>
  )
}
