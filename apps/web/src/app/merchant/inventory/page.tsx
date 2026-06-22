import { MerchantInventoryClient } from '@/components/merchant/inventory/MerchantInventoryClient'

export default function MerchantInventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Inventory Management</h2>
        <p className="text-sm text-gray-500">
          Scan barcodes, track stock, manage variants, SKU, pricing and product details
        </p>
      </div>
      <MerchantInventoryClient />
    </div>
  )
}
