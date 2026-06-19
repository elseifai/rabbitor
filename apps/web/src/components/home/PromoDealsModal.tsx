'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react'
import { ProductImage } from '@/components/products/ProductImage'
import { useCartStore } from '@/store'
import { cn, formatCurrency } from '@/lib/utils'

export type PromoDealProduct = {
  id: string
  name: string
  unit: string
  price: number
  mrp?: number | null
  image: string | null
  shopId: string
  shopName: string
  shopSlug: string
  stock?: number
}

type PromoDealsModalProps = {
  open: boolean
  onClose: () => void
  products: PromoDealProduct[]
  headline?: string
}

const SWIPE_THRESHOLD = 48

function sortLowToHigh(products: PromoDealProduct[]) {
  return [...products].sort((a, b) => a.price - b.price)
}

export function PromoDealsModal({
  open,
  onClose,
  products,
  headline = 'Products Starting from Just ₹1!',
}: PromoDealsModalProps) {
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const sorted = useMemo(() => sortLowToHigh(products), [products])
  const [index, setIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)
  const touchStartX = useRef<number | null>(null)

  const product = sorted[index]
  const hasMultiple = sorted.length > 1

  useEffect(() => {
    if (!open) return
    setIndex(0)
    setSelectedId(null)
    setAddedId(null)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const goPrev = useCallback(() => {
    setIndex((i) => (sorted.length ? (i - 1 + sorted.length) % sorted.length : 0))
    setAddedId(null)
  }, [sorted.length])

  const goNext = useCallback(() => {
    setIndex((i) => (sorted.length ? (i + 1) % sorted.length : 0))
    setAddedId(null)
  }, [sorted.length])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, goPrev, goNext])

  const openProduct = (p: PromoDealProduct) => {
    onClose()
    router.push(`/product/${p.id}`)
  }

  const handleAddToCart = (p: PromoDealProduct) => {
    if (p.stock === 0) return
    addItem({
      id: p.id,
      storeId: p.shopId,
      storeName: p.shopName,
      name: p.name,
      price: p.price,
      image: p.image ?? undefined,
    })
    setAddedId(p.id)
    window.setTimeout(() => setAddedId(null), 2000)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || !hasMultiple) return
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    if (delta > SWIPE_THRESHOLD) goPrev()
    else if (delta < -SWIPE_THRESHOLD) goNext()
    touchStartX.current = null
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
          <motion.button
            type="button"
            aria-label="Close offers"
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-deals-title"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="relative bg-gradient-to-br from-[#FF6B35] via-[#FF7A45] to-[#FF8C61] px-5 pb-5 pt-5 text-white">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition hover:bg-white/30"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 pr-10">
                <Sparkles className="h-5 w-5 shrink-0 text-amber-200" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                  Exclusive offer
                </p>
              </div>
              <h2 id="promo-deals-title" className="mt-2 pr-8 text-xl font-black leading-tight sm:text-2xl">
                {headline}
              </h2>
              <p className="mt-1 text-sm text-white/85">
                Sorted lowest price first — swipe to browse deals
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {sorted.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-500">
                  No promotional products available right now.
                </p>
              ) : product ? (
                <>
                  <div className="relative">
                    {hasMultiple && (
                      <>
                        <button
                          type="button"
                          onClick={goPrev}
                          className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md"
                          aria-label="Previous product"
                        >
                          <ChevronLeft className="h-5 w-5 text-slate-700" />
                        </button>
                        <button
                          type="button"
                          onClick={goNext}
                          className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md"
                          aria-label="Next product"
                        >
                          <ChevronRight className="h-5 w-5 text-slate-700" />
                        </button>
                      </>
                    )}

                    <AnimatePresence mode="wait">
                      <motion.article
                        key={product.id}
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.22 }}
                        className="mx-8 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg"
                      >
                        <button
                          type="button"
                          onClick={() => openProduct(product)}
                          className="block w-full text-left"
                        >
                          <ProductImage
                            src={product.image}
                            alt={product.name}
                            className="rounded-none"
                            fallback="🛒"
                          />
                          <div className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B35]">
                              {product.shopName}
                            </p>
                            <h3 className="mt-1 line-clamp-2 text-base font-black text-slate-900">
                              {product.name}
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-500">{product.unit}</p>
                            <div className="mt-3 flex items-end gap-2">
                              <span className="text-2xl font-black text-[#0C831F]">
                                {formatCurrency(product.price)}
                              </span>
                              {product.mrp != null && product.mrp > product.price && (
                                <span className="pb-0.5 text-sm text-slate-400 line-through">
                                  {formatCurrency(product.mrp)}
                                </span>
                              )}
                            </div>
                            {product.mrp != null && product.mrp > product.price && (
                              <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                                {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF
                              </span>
                            )}
                          </div>
                        </button>

                        <div className="flex gap-2 border-t border-slate-100 p-3">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedId((id) => (id === product.id ? null : product.id))
                            }
                            className={cn(
                              'flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition',
                              selectedId === product.id
                                ? 'border-[#0C831F] bg-emerald-50 text-[#0C831F]'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300',
                            )}
                          >
                            <Check
                              className={cn(
                                'h-4 w-4',
                                selectedId === product.id ? 'opacity-100' : 'opacity-40',
                              )}
                            />
                            {selectedId === product.id ? 'Selected' : 'Select'}
                          </button>
                          <button
                            type="button"
                            disabled={product.stock === 0}
                            onClick={() => handleAddToCart(product)}
                            className={cn(
                              'flex flex-[1.4] items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black text-white transition disabled:opacity-40',
                              addedId === product.id
                                ? 'bg-[#0C831F]'
                                : 'bg-[#FF6B35] hover:bg-[#e55f2f]',
                            )}
                          >
                            <ShoppingCart className="h-4 w-4" />
                            {addedId === product.id
                              ? 'Added!'
                              : product.stock === 0
                                ? 'Out of stock'
                                : 'Add to Cart'}
                          </button>
                        </div>
                      </motion.article>
                    </AnimatePresence>
                  </div>

                  {hasMultiple && (
                    <div className="mt-4 flex items-center justify-center gap-1.5">
                      {sorted.map((p, i) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setIndex(i)
                            setAddedId(null)
                          }}
                          className={cn(
                            'h-2 rounded-full transition-all',
                            i === index ? 'w-6 bg-[#FF6B35]' : 'w-2 bg-slate-200',
                          )}
                          aria-label={`Go to product ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  <p className="mt-3 text-center text-[10px] font-medium text-slate-400">
                    {index + 1} of {sorted.length} · Tap image for details
                  </p>
                </>
              ) : null}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
