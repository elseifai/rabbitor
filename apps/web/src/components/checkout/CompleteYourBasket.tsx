'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Sparkles } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

export type RecommendationProduct = {
  id: string
  name: string
  price: number
  mrp?: number | null
  unit: string
  image: string | null
  shopId: string
  shopSlug: string
  shopName: string
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

function RecommendationTile({
  product,
  onAdd,
  justAdded,
}: {
  product: RecommendationProduct
  onAdd: () => void
  justAdded: boolean
}) {
  return (
    <motion.div
      layout
      whileHover={{ y: -4, scale: 1.02 }}
      transition={spring}
      className={cn(
        'relative flex w-[132px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/60',
        'bg-gradient-to-br from-white via-[#FFF8F5] to-[#FFEDD5]',
        'shadow-[0_8px_24px_rgba(255,107,53,0.12)]',
      )}
    >
      <div className="relative h-[88px] w-full bg-gradient-to-br from-orange-50 to-amber-100">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">🛒</div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-[#FF6B35] px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
          Quick add
        </span>
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <p className="line-clamp-2 text-[11px] font-bold leading-tight text-[#1C1C1C]">
          {product.name}
        </p>
        <p className="mt-0.5 text-[9px] font-semibold text-[#878787]">{product.unit}</p>
        <div className="mt-auto flex items-end justify-between gap-1 pt-2">
          <div>
            <p className="text-sm font-black text-[#0C831F]">{formatCurrency(product.price)}</p>
            {product.mrp && product.mrp > product.price && (
              <p className="text-[9px] text-[#878787] line-through">{formatCurrency(product.mrp)}</p>
            )}
          </div>
          <motion.button
            type="button"
            onClick={onAdd}
            whileTap={{ scale: 0.88 }}
            animate={justAdded ? { scale: [1, 1.2, 1], backgroundColor: ['#0C831F', '#22c55e', '#0C831F'] } : {}}
            transition={spring}
            className="flex h-8 min-w-[52px] items-center justify-center gap-0.5 rounded-xl bg-[#0C831F] px-2 text-[10px] font-black text-white shadow-md"
          >
            {justAdded ? '✓' : <><Plus className="h-3 w-3" /> ADD</>}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export function CompleteYourBasket({
  shopIds,
  onTotalBump,
}: {
  shopIds: string[]
  cartProductIds?: string[]
  onTotalBump?: () => void
}) {
  const { addItem, items } = useCart()
  const [products, setProducts] = useState<RecommendationProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const cartQuery = useMemo(() => {
    if (shopIds.length === 0) return null
    const byShop: Record<string, string[]> = {}
    for (const shopId of shopIds) byShop[shopId] = []
    for (const item of items) {
      if (byShop[item.storeId]) byShop[item.storeId]!.push(item.id)
    }
    return JSON.stringify({
      shops: shopIds.map((shopId) => ({
        shopId,
        productIds: byShop[shopId] ?? [],
      })),
    })
  }, [shopIds, items])

  const fetchRecommendations = useCallback(async () => {
    if (!cartQuery) {
      setProducts([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `/api/products/recommendations?cart=${encodeURIComponent(cartQuery)}&limit=12`,
      )
      const json = await res.json()
      if (json.success) {
        const inCart = new Set(items.map((i) => i.id))
        setProducts(
          (json.data as RecommendationProduct[]).filter(
            (p) => !inCart.has(p.id) && !addedIds.has(p.id),
          ),
        )
      }
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [cartQuery, items, addedIds])

  useEffect(() => {
    void fetchRecommendations()
  }, [fetchRecommendations])

  const handleAdd = (product: RecommendationProduct) => {
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        storeId: product.shopId,
        storeName: product.shopName,
        image: product.image ?? undefined,
      },
      1,
    )
    setAddedIds((prev) => new Set(prev).add(product.id))
    onTotalBump?.()
    window.setTimeout(() => {
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
    }, 600)
  }

  if (loading && products.length === 0) {
    return (
      <div className="space-y-3 rounded-[2rem] border bg-white p-5 shadow-xs">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[168px] w-[132px] shrink-0 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) return null

  const loopItems = [...products, ...products]

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="space-y-3 overflow-hidden rounded-[2rem] border border-orange-100/80 bg-gradient-to-br from-white to-[#FFF7ED] p-5 shadow-xs"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF6B35] text-white shadow-lg shadow-orange-200/50">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B35]">
            Complete your basket
          </h3>
          <p className="text-[10px] font-semibold text-[#878787]">
            High-velocity picks customers add last-minute
          </p>
        </div>
      </div>

      <div className="relative -mx-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#FFF7ED] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#FFF7ED] to-transparent" />
        <div className="overflow-hidden py-1">
          <div className="flex w-max animate-checkout-marquee gap-3 hover:[animation-play-state:paused]">
            {loopItems.map((product, idx) => (
              <RecommendationTile
                key={`${product.id}-${idx}`}
                product={product}
                onAdd={() => handleAdd(product)}
                justAdded={addedIds.has(product.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {addedIds.size > 0 && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-center text-[10px] font-bold text-[#0C831F]"
          >
            {addedIds.size} item{addedIds.size !== 1 ? 's' : ''} added — bill updated
          </motion.p>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
