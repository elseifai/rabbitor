import { Suspense } from 'react'
import { EssentialsCatalogView } from '@/components/catalog/EssentialsCatalogView'

function EssentialsFallback() {
  return (
    <div className="mx-auto flex h-[100dvh] max-w-[480px] items-center justify-center bg-white">
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
