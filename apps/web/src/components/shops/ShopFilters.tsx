'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { HOME_CATEGORIES } from '@/lib/constants'
import { resolveCategoryHref } from '@/lib/category-routing'

const SORT_OPTIONS = [
  { id: 'distance', label: 'Nearest' },
  { id: 'eta', label: 'Fastest' },
  { id: 'rating', label: 'Top rated' },
] as const

export function ShopFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const category = params.get('category') ?? ''
  const sort = params.get('sort') ?? 'distance'
  const openOnly = params.get('open') !== 'false'

  const setParam = (key: string, value: string | null) => {
    if (key === 'category' && value) {
      router.push(resolveCategoryHref(value))
      return
    }
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/shops?${next.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          type="button"
          onClick={() => setParam('category', null)}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition',
            !category ? 'bg-rabbit-600 text-white' : 'bg-gray-100 text-gray-600',
          )}
        >
          All
        </button>
        {HOME_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setParam('category', c.id)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition',
              category === c.id ? 'bg-rabbit-600 text-white' : 'bg-gray-100 text-gray-600',
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setParam('sort', o.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium',
                sort === o.id
                  ? 'bg-rabbit-50 text-rabbit-700 ring-1 ring-rabbit-200'
                  : 'text-gray-500 hover:bg-gray-50',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(e) => setParam('open', e.target.checked ? null : 'false')}
            className="rounded border-gray-300 text-rabbit-600"
          />
          Open now only
        </label>
      </div>
    </div>
  )
}
