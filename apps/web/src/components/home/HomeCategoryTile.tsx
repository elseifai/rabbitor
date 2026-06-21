'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { resolveCategoryHref } from '@/lib/category-routing'
import { resolveSegmentFromTile } from '@/lib/essentials-catalog-segments'
import { resolveImageSrc } from '@/lib/image-url'
import { cn } from '@/lib/utils'

export type HomeCategoryTileProps = {
  label: string
  image: string
  /** Essentials slug (kirana, veggies, fish) or marketplace slug (bakery, general). */
  category: string
  tall?: boolean
}

/**
 * Sub-category tile for Grocery & Kitchen / Snacks & Drinks home sections.
 * Essentials slugs route to /essentials; marketplace slugs route to /shops.
 */
export function HomeCategoryTile({ label, image, category, tall }: HomeCategoryTileProps) {
  const [failed, setFailed] = useState(false)
  const src = resolveImageSrc(image, '')
  const showImage = Boolean(src) && !failed
  const href = resolveCategoryHref(resolveSegmentFromTile(label, category))

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <Link href={href} className="overflow-hidden rounded-xl bg-[#F8F8F8]">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn('w-full object-cover', tall ? 'h-[120px]' : 'h-[90px]')}
        />
      ) : (
        <div
          className={cn(
            'flex w-full items-center justify-center bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5]',
            tall ? 'h-[120px]' : 'h-[90px]',
          )}
        >
          <span className="text-3xl opacity-80">🛒</span>
        </div>
      )}
      <p className="p-2 text-sm font-bold leading-tight text-[#1C1C1C]">{label}</p>
    </Link>
  )
}
