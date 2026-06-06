import { MerchantSettingsClient } from '@/components/merchant/MerchantSettingsClient'

export default function MerchantSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Shop status, delivery fees, and operating preferences</p>
      </div>
      <MerchantSettingsClient />
    </div>
  )
}
