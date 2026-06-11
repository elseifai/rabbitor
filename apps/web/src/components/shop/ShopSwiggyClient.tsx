'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star, Clock, Search, Plus, Minus, ShoppingBag } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import type { CatalogShop } from '@/lib/shop-catalog'

export type ShopMeta = {
  subtitle: string
  rating: string
  eta: string
  categories: string[]
}

export type ProductExtra = {
  desc: string
  rating: string
  image: string
  category: string
}

const SHOP_META: Record<string, ShopMeta> = {
  'shop-1': {
    subtitle: 'Sea Fish • Cleaned Shrimp • Local Catch',
    rating: '4.4',
    eta: '20-25 Mins Delivery',
    categories: ['Bestsellers', 'Fresh Catch', 'Marinated', 'Value Packs'],
  },
  'shop-2': {
    subtitle: 'Atta • Dals • Spices • Household Essentials',
    rating: '4.1',
    eta: '10-15 Mins Delivery',
    categories: ['Bestsellers', 'Staples', 'Snacks', 'Value Packs'],
  },
  'shop-3': {
    subtitle: 'Daily Slippers • Sandals • Local Crafts',
    rating: '4.5',
    eta: '30-35 Mins Delivery',
    categories: ['Bestsellers', 'Sandals', 'Sports', 'Formal'],
  },
}

const PRODUCT_EXTRAS: Record<string, ProductExtra> = {
  '101': {
    desc: 'Perfectly sliced, clean water catch. Bone-in steaks perfect for authentic local curries or pan fry.',
    rating: '4.9',
    image:
      'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&w=200&q=80',
    category: 'Bestsellers',
  },
  '102': {
    desc: 'De-shelled and deveined. Extracted fresh daily from local docks. Super juicy texture.',
    rating: '4.7',
    image:
      'https://images.unsplash.com/photo-1559737558-2f5a34f643e1?auto=format&fit=crop&w=200&q=80',
    category: 'Fresh Catch',
  },
  '201': {
    desc: 'Premium long-grain basmati rice. Aromatic and fluffy — ideal for daily meals.',
    rating: '4.6',
    image:
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=200&q=80',
    category: 'Bestsellers',
  },
  '202': {
    desc: 'Farm-sourced toor dal. Rich protein staple for Indian home cooking.',
    rating: '4.5',
    image:
      'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a2c?auto=format&fit=crop&w=200&q=80',
    category: 'Staples',
  },
  '203': {
    desc: 'Refined sunflower oil for everyday frying and cooking needs.',
    rating: '4.4',
    image:
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=200&q=80',
    category: 'Staples',
  },
  '301': {
    desc: 'Lightweight running shoes built for comfort on Mumbai streets.',
    rating: '4.3',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80',
    category: 'Sports',
  },
  '302': {
    desc: 'Handcrafted leather sandals from a trusted neighbourhood cobbler.',
    rating: '4.5',
    image:
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=200&q=80',
    category: 'Bestsellers',
  },
}

const DEFAULT_EXTRA: ProductExtra = {
  desc: 'Fresh from your local neighbourhood vendor.',
  rating: '4.5',
  image:
    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=200&q=80',
  category: 'Bestsellers',
}

export function ShopSwiggyClient({
  shop,
  meta: metaOverride,
  productExtras: productExtrasOverride,
}: {
  shop: CatalogShop
  meta?: ShopMeta
  productExtras?: Record<string, ProductExtra>
}) {
  const meta = metaOverride ??
    SHOP_META[shop.id] ?? {
      subtitle: 'Local essentials delivered fast',
      rating: '4.5',
      eta: '15-20 Mins Delivery',
      categories: ['Bestsellers', 'Popular', 'Value Packs'],
    }

  const extrasMap = productExtrasOverride ?? PRODUCT_EXTRAS

  const [activeCategory, setActiveCategory] = useState(meta.categories[0])

  const { items, addItem, updateQuantity } = useCart()

  const getQty = (productId: string) =>
    items.find((i) => i.id === productId)?.quantity ?? 0

  const updateQty = (product: CatalogShop['products'][number], delta: number) => {
    const current = getQty(product.id)
    const next = current + delta

    if (next <= 0) {
      updateQuantity(product.id, 0)
      return
    }

    if (current === 0) {
      addItem({
        id: product.id,
        storeId: shop.id,
        storeName: shop.name,
        name: product.name,
        price: product.price,
        image: product.image,
      })
      if (next > 1) updateQuantity(product.id, next)
      return
    }

    updateQuantity(product.id, next)
  }

  const displayProducts = shop.products.filter((p) => {
    const extra = extrasMap[p.id] ?? DEFAULT_EXTRA
    return extra.category === activeCategory
  })

  const totalCartItems = items.reduce((n, i) => n + i.quantity, 0)

  return (
    <div className="relative mx-auto min-h-screen max-w-xl bg-white pb-32 font-sans text-slate-900 antialiased shadow-2xl">
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-50 bg-white/80 px-4 py-4 backdrop-blur-md">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-700 transition hover:text-[#FF6B35]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="relative w-48">
          <input
            type="text"
            placeholder="Search in store..."
            className="w-full rounded-xl bg-slate-50 py-1.5 pl-3 pr-8 text-xs font-semibold transition focus:bg-slate-100/80 focus:outline-none"
          />
          <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      <div className="space-y-6 p-5">
        <div className="space-y-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-[0_10px_3px_rgba(0,0,0,0.01)]">
          <div>
            <span className="rounded-md bg-[#FFF8F5] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#FF6B35]">
              Rabbit Partner
            </span>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">{shop.name}</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-400">{meta.subtitle}</p>
          </div>

          <div className="flex items-center gap-4 border-t border-slate-50 pt-2 text-xs font-bold text-slate-700">
            <div className="flex items-center gap-1">
              <span className="flex items-center justify-center rounded bg-green-600 p-0.5 text-white">
                <Star className="h-3 w-3 fill-current" />
              </span>
              <span>{meta.rating} (100+ ratings)</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1 text-slate-600">
              <Clock className="h-4 w-4 text-[#FF6B35]" />
              <span>{meta.eta}</span>
            </div>
          </div>
        </div>

        <div className="sticky top-[69px] z-40 flex gap-2 overflow-x-auto border-b border-slate-50 bg-white py-2 scrollbar-hide">
          {meta.categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold tracking-tight transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-[#FF6B35] text-white shadow-sm shadow-[#FF6B35]/20'
                  : 'bg-[#FFF8F5] text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="pt-2">
          <h3 className="flex items-center gap-1.5 text-base font-black tracking-tight text-slate-900">
            {activeCategory}{' '}
            <span className="text-xs font-bold text-slate-400">({displayProducts.length})</span>
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {displayProducts.length === 0 && (
            <p className="py-10 text-center text-sm font-medium text-slate-400">
              No items in this category yet — check back soon.
            </p>
          )}
          {displayProducts.map((prod) => {
            const extra = extrasMap[prod.id] ?? DEFAULT_EXTRA
            const qty = getQty(prod.id)

            return (
              <div
                key={prod.id}
                className="group flex items-start justify-between gap-4 bg-white py-6"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-red-500 p-0.5 text-[7px] font-black text-red-500">
                      ●
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {extra.rating}
                    </span>
                  </div>
                  <h4 className="text-sm font-black leading-snug tracking-tight text-slate-900 transition group-hover:text-[#FF6B35]">
                    {prod.name}
                  </h4>
                  <p className="text-sm font-black text-slate-800">₹{prod.price}</p>
                  <p className="line-clamp-2 text-xs font-medium leading-relaxed text-slate-400">
                    {extra.desc}
                  </p>
                </div>

                <div className="relative mt-2 h-28 w-28 shrink-0 overflow-visible rounded-2xl bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={extra.image}
                    alt={prod.name}
                    className="h-full w-full rounded-2xl border border-slate-100 object-cover"
                  />

                  <div className="absolute -bottom-3 left-1/2 flex h-8 w-24 -translate-x-1/2 items-center justify-between overflow-hidden rounded-xl border border-slate-100 bg-white shadow-md">
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => updateQty(prod, 1)}
                        className="h-full w-full text-center text-xs font-black uppercase tracking-wider text-[#FF6B35] transition hover:bg-[#FFF8F5]"
                      >
                        Add
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => updateQty(prod, -1)}
                          className="flex h-full w-8 items-center justify-center text-[#FF6B35] transition hover:bg-slate-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-black text-[#FF6B35]">{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(prod, 1)}
                          className="flex h-full w-8 items-center justify-center text-[#FF6B35] transition hover:bg-slate-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {totalCartItems > 0 && (
        <div className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-lg animate-slide-up items-center justify-between rounded-2xl bg-green-600 p-4 text-white shadow-xl shadow-green-700/20">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            <div className="text-xs font-bold">
              <span>
                {totalCartItems} Item{totalCartItems > 1 ? 's' : ''} added
              </span>
              <span className="mx-1.5 text-white/40">|</span>
              <span>View Cart</span>
            </div>
          </div>
          <Link
            href="/checkout"
            className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider transition hover:bg-white/20"
          >
            Next Stop →
          </Link>
        </div>
      )}
    </div>
  )
}
