import { Suspense } from 'react'
import { ShopsListing } from '@/components/shops/ShopsListing'

export default function ShopsPage() {
  return (
    <Suspense fallback={null}>
      <ShopsListing />
    </Suspense>
  )
}
