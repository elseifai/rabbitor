'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Search, Store } from 'lucide-react'
import {
  UnifiedProductCard,
  type UnifiedProductData,
} from '@/components/products/UnifiedProductCard'
import { RotatingSearchBar } from '@/components/navigation/RotatingSearchBar'

type ShopHit = {
  id: string
  name: string
  slug: string
  category: string
  image: string | null
}

function SearchResults() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQ)
  const [products, setProducts] = useState<UnifiedProductData[]>([])
  const [shops, setShops] = useState<ShopHit[]>([])
  const [loading, setLoading] = useState(false)

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      setProducts([])
      setShops([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
      const json = await res.json()
      if (json.success) {
        setProducts(json.products ?? [])
        setShops(json.shops ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setQuery(initialQ)
    void runSearch(initialQ)
  }, [initialQ, runSearch])

  const handleSubmit = (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <>
      <div className="sticky top-0 z-40 border-b bg-white px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-base font-black text-gray-900">Search</h1>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit(query)
          }}
        >
          <RotatingSearchBar value={query} onChange={setQuery} onSubmit={handleSubmit} />
        </form>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
          </div>
        ) : query.trim().length < 2 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            Type at least 2 characters to search products and stores
          </p>
        ) : products.length === 0 && shops.length === 0 ? (
          <div className="py-12 text-center">
            <Search className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 font-bold text-gray-700">No results for &quot;{query}&quot;</p>
          </div>
        ) : (
          <div className="space-y-6">
            {shops.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-400">
                  <Store className="h-3.5 w-3.5" /> Stores
                </h2>
                <div className="space-y-2">
                  {shops.map((s) => (
                    <Link
                      key={s.id}
                      href={`/shops/${s.slug}`}
                      className="block rounded-xl border bg-white px-4 py-3 hover:border-[#FF6B35]/30"
                    >
                      <p className="font-bold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.category}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {products.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-gray-400">
                  Products ({products.length})
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {products.map((p) => (
                    <UnifiedProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// LIVE ECOSYSTEM UPGRADE — dedicated search results page
export default function SearchPage() {
  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#F8FAFC] pb-24">
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </div>
  )
}
