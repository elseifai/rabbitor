import { Suspense } from 'react'
import { EssentialsCatalogView } from '@/components/catalog/EssentialsCatalogView'

function EssentialsFallback() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] items-center justify-center bg-[#F0F0F0]">
      <div className="h-8 w-8 animate-pulse rounded-full bg-[#E0E0E0]" />
    </div>
  )
}

export default function EssentialsCategoryPage() {
  return (
    <Suspense fallback={<EssentialsFallback />}>
      <EssentialsCatalogView />
    </Suspense>
  )
}
