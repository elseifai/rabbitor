import { MerchantProductsClient } from '@/components/merchant/MerchantProductsClient'

export default function MerchantProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Products</h2>
        <p className="text-sm text-gray-500">
          Add photos, set prices, and toggle items live on your storefront
        </p>
      </div>
      <MerchantProductsClient />
    </div>
  )
}
