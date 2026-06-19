import { Suspense } from 'react'
import { RestaurantsListing } from '@/components/restaurants/RestaurantsListing'

export default function RestaurantsPage() {
  return (
    <Suspense fallback={null}>
      <RestaurantsListing />
    </Suspense>
  )
}
