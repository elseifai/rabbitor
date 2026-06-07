'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, Share2, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/store'
import { cn, formatCurrency } from '@/lib/utils'
import { AdBanner } from '@/components/ads/AdBanner'

interface Product {
  id: string
  name: string
  price: number
  unit: string
  image: string | null
  isAvailable: boolean
  description?: string | null
}

interface ShopData {
  id: string
  name: string
  slug: string
  isActive: boolean
  address: string
  minOrderValue: number
  baseDeliveryFee: number
  avgPrepMinutes: number
  products: Product[]
}

const SIDEBAR_ICONS: Record<string, string> = {
  All: '🏪',
  'Rice & Atta': '🌾',
  'Oils & Ghee': '🫒',
  Snacks: '🍿',
  Beverages: '🥤',
  Household: '🧹',
  'Personal Care': '🧴',
}

function categorizeProduct(name: string): string {
  const n = name.toLowerCase()
  if (/atta|rice|salt|maggi|noodles|pav|bread/.test(n)) return 'Rice & Atta'
  if (/oil|ghee|butter/.test(n)) return 'Oils & Ghee'
  if (/lays|biscuit|parle|chips|cookies|snack|maggi/.test(n)) return 'Snacks'
  if (/tea|milk|lassi|water|juice/.test(n)) return 'Beverages'
  if (/detergent|tissue|match|candle|notebook|pen/.test(n)) return 'Household'
  if (/colgate|dettol|vitamin|paracetamol|band/.test(n)) return 'Personal Care'
  return 'Snacks'
}

export function ShopDetailClient({ shop }: { shop: ShopData }) {
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const cartItems = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total())
  const itemCount = useCartStore((s) => s.itemCount())
  const shopCartItems = cartItems.filter((i) => i.shopId === shop.id)

  const [activeCat, setActiveCat] = useState('All')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>()
    for (const p of shop.products) {
      const cat = categorizeProduct(p.name)
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(p)
    }
    return map
  }, [shop.products])

  const categories = useMemo(() => ['All', ...Array.from(grouped.keys())], [grouped])

  const scrollToCategory = useCallback((cat: string) => {
    setActiveCat(cat)
    if (cat === 'All') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    sectionRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const deliveryLabel =
    shop.baseDeliveryFee === 0 ? 'FREE delivery' : `₹${shop.baseDeliveryFee} delivery`

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-white pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/shops" className="p-1">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <h1 className="flex-1 truncate px-2 text-center text-sm font-bold">{shop.name}</h1>
          <div className="flex gap-2">
            <button type="button" className="p-1 text-gray-600">
              <Search className="h-5 w-5" />
            </button>
            <button type="button" className="p-1 text-gray-600">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
        <p className="px-4 pb-2 text-center text-xs text-gray-500">
          {shop.isActive ? 'OPEN' : 'CLOSED'} · {shop.avgPrepMinutes}-{shop.avgPrepMinutes + 5} min ·{' '}
          {deliveryLabel}
        </p>

        {/* Offer chips */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {['WELCOME50 - ₹50 off', 'RABBIT20 - 20% off', 'Free delivery above ₹199'].map(
            (offer) => (
              <span
                key={offer}
                className="shrink-0 rounded-full border border-[#0C831F] px-3 py-1 text-[11px] font-semibold text-[#0C831F]"
              >
                🏷️ {offer}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-[120px] h-[calc(100vh-120px)] w-20 shrink-0 overflow-y-auto border-r border-gray-100 bg-white">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => scrollToCategory(cat)}
              className={cn(
                'flex w-full flex-col items-center gap-0.5 border-l-2 px-1 py-3 text-[9px] font-semibold leading-tight',
                activeCat === cat
                  ? 'border-[#FF6B35] bg-[#FFF8F5] text-[#FF6B35]'
                  : 'border-transparent text-gray-500',
              )}
            >
              <span className="text-lg">{SIDEBAR_ICONS[cat] ?? '📦'}</span>
              {cat}
            </button>
          ))}
        </aside>

        {/* Products */}
        <div className="min-w-0 flex-1 px-3 py-3">
          {activeCat === 'All' ? (
            <>
              {categories.slice(1).map((cat, idx) => (
                <section
                  key={cat}
                  ref={(el) => {
                    sectionRefs.current[cat] = el
                  }}
                  className="mb-6 scroll-mt-32"
                >
                  {idx === 1 && (
                    <AdBanner placement="SHOP_PAGE" className="mb-4 h-28 w-full" />
                  )}
                  <h2 className="mb-2 text-sm font-bold text-gray-900">{cat}</h2>
                  <div className="space-y-3">
                    {(grouped.get(cat) ?? []).map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        shop={shop}
                        inCart={cartItems.find((i) => i.productId === product.id)}
                        addItem={addItem}
                        updateQuantity={updateQuantity}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {categories.length === 1 && (
                <div className="space-y-3">
                  {shop.products.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      shop={shop}
                      inCart={cartItems.find((i) => i.productId === product.id)}
                      addItem={addItem}
                      updateQuantity={updateQuantity}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <section>
              <h2 className="mb-2 text-sm font-bold text-gray-900">{activeCat}</h2>
              <div className="space-y-3">
                {(grouped.get(activeCat) ?? []).map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    shop={shop}
                    inCart={cartItems.find((i) => i.productId === product.id)}
                    addItem={addItem}
                    updateQuantity={updateQuantity}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Sticky cart bar */}
      {shopCartItems.length > 0 && (
        <Link
          href="/cart"
          className="fixed bottom-[72px] left-1/2 z-50 flex w-[calc(100%-32px)] max-w-[448px] -translate-x-1/2 animate-in slide-in-from-bottom-4 items-center justify-between rounded-xl bg-[#0C831F] px-5 py-3.5 font-semibold text-white shadow-lg"
        >
          <span>{itemCount} items</span>
          <span>View Cart → {formatCurrency(total)}</span>
        </Link>
      )}
    </div>
  )
}

function ProductRow({
  product,
  shop,
  inCart,
  addItem,
  updateQuantity,
}: {
  product: Product
  shop: ShopData
  inCart?: { quantity: number }
  addItem: ReturnType<typeof useCartStore.getState>['addItem']
  updateQuantity: ReturnType<typeof useCartStore.getState>['updateQuantity']
}) {
  return (
    <div className="flex gap-3 border-b border-gray-50 pb-3">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl">🛒</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-bold text-gray-900">{product.name}</p>
        <p className="text-[11px] text-gray-400">{product.unit}</p>
        <p
          className={cn(
            'mt-0.5 text-[11px] font-semibold',
            product.isAvailable ? 'text-[#0C831F]' : 'text-red-500',
          )}
        >
          {product.isAvailable ? 'In stock' : 'Out of stock'}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between">
        <p className="text-sm font-bold text-[#0C831F]">{formatCurrency(product.price)}</p>
        {inCart ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#0C831F] text-[#0C831F]"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-sm font-bold">{inCart.quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0C831F] text-white"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={!shop.isActive || !product.isAvailable}
            onClick={() =>
              addItem({
                productId: product.id,
                shopId: shop.id,
                shopName: shop.name,
                shopSlug: shop.slug,
                name: product.name,
                price: product.price,
                unit: product.unit,
                image: product.image ?? undefined,
              })
            }
            className="rounded-lg border-2 border-[#0C831F] px-4 py-1 text-xs font-bold text-[#0C831F] disabled:opacity-40"
          >
            ADD
          </button>
        )}
      </div>
    </div>
  )
}
