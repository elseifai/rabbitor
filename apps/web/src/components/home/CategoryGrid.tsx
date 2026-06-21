import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { HOME_CATEGORIES } from '@/lib/constants'
import { resolveCategoryHref } from '@/lib/category-routing'

export function CategoryGrid() {
  return (
    <section id="categories" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
            Shop by category
          </h2>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">
            From kirana staples to fresh catch — all from local stores
          </p>
        </div>
        <Link
          href="/shops"
          className="hidden items-center gap-1 text-sm font-semibold text-rabbit-600 hover:text-rabbit-700 sm:flex"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {HOME_CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <Link
              key={cat.id}
              href={resolveCategoryHref(cat.id)}
              className={`group flex flex-col items-center rounded-2xl border border-transparent p-4 text-center transition-all duration-200 ${cat.bg} hover:border-gray-200 hover:shadow-card-hover sm:p-5`}
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition group-hover:scale-105 ${cat.color}`}
              >
                <Icon className="h-7 w-7" strokeWidth={1.75} />
              </span>
              <span className="mt-3 font-semibold text-gray-900">{cat.name}</span>
              <span className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                {cat.description}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
