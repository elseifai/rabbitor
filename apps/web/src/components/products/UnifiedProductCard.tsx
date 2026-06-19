'use client'

import { useRouter } from 'next/navigation'
import { Minus, Plus } from 'lucide-react'
import { useCartStore } from '@/store'
import { ProductImage } from '@/components/products/ProductImage'
import { cn, formatCurrency } from '@/lib/utils'

export type ProductCardVariant = 'GROCERY' | 'RETAIL'

export type UnifiedProductData = {
  id: string
  name: string
  price: number
  mrp?: number | null
  unit?: string
  variantName?: string
  image?: string | null
  storeId: string
  storeName: string
  storeType?: string
  stock?: number
  optionCount?: number
  sizes?: string[]
  colors?: string[]
}

const STORE_PLACEHOLDERS: Record<string, { emoji: string; bg: string }> = {
  KIRANA: { emoji: '🛒', bg: 'bg-orange-100' },
  FISH: { emoji: '🐟', bg: 'bg-blue-100' },
  VEGETABLE: { emoji: '🥦', bg: 'bg-green-100' },
  PHARMACY: { emoji: '💊', bg: 'bg-red-100' },
  DAIRY: { emoji: '🥛', bg: 'bg-yellow-100' },
  BAKERY: { emoji: '🍞', bg: 'bg-amber-100' },
  GENERAL: { emoji: '👗', bg: 'bg-pink-100' },
}

function buildCartPayload(product: UnifiedProductData) {
  return {
    id: product.id,
    storeId: product.storeId,
    storeName: product.storeName,
    name: product.name,
    price: product.price,
    image: product.image ?? undefined,
  }
}

export function UnifiedProductCard({
  product,
  variant = 'GROCERY',
  className,
  eagerImage = false,
}: {
  product: UnifiedProductData
  variant?: ProductCardVariant
  className?: string
  eagerImage?: boolean
}) {
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const inCart = useCartStore((s) => s.items.find((i) => i.id === product.id))

  const openProductDetail = () => {
    router.push(`/product/${product.id}`)
  }

  const originalPrice =
    product.mrp && product.mrp > product.price ? product.mrp : null
  const discount = originalPrice
    ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
    : 0
  const outOfStock = product.stock === 0
  const placeholder =
    STORE_PLACEHOLDERS[product.storeType ?? ''] ?? { emoji: '📦', bg: 'bg-gray-100' }
  const optionCount = product.optionCount ?? 3
  const sizeLabel = product.variantName || product.unit || '1 pc'

  const handleAdd = () => {
    addItem(buildCartPayload(product))
  }

  if (variant === 'RETAIL') {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={openProductDetail}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openProductDetail()
          }
        }}
        className={cn(
          'cursor-pointer overflow-hidden rounded-2xl border border-[#F0F0F0] bg-white transition hover:shadow-md',
          className,
        )}
      >
        <div className="relative">
          <ProductImage
            src={product.image}
            alt={product.name}
            fallback={placeholder.emoji}
            className={placeholder.bg}
            eager={eagerImage}
          />

          {originalPrice && discount > 0 && (
            <span className="absolute left-2 top-2 rounded-full bg-[#1C1C1C] px-2 py-0.5 text-[10px] font-bold text-white">
              {discount}% OFF
            </span>
          )}

          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">
              Out of Stock
            </div>
          )}
        </div>

        <div className="space-y-2 p-3">
          <div>
            <p className="line-clamp-2 text-[13px] font-bold leading-snug text-[#1C1C1C]">
              {product.name}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(product.sizes ?? ['S', 'M', 'L', 'XL']).slice(0, 4).map((size) => (
                <span
                  key={size}
                  className="rounded border border-[#E5E7EB] px-1.5 py-0.5 text-[9px] font-semibold text-[#6B7280]"
                >
                  {size}
                </span>
              ))}
              {(product.colors ?? ['Black', 'White']).map((color) => (
                <span
                  key={color}
                  className="rounded-full bg-[#FCE7F3] px-2 py-0.5 text-[9px] font-semibold text-[#DB2777]"
                >
                  {color}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-base font-black text-[#1C1C1C]">
              {formatCurrency(product.price)}
            </span>
            {originalPrice && (
              <span className="text-xs text-[#9CA3AF] line-through">
                {formatCurrency(originalPrice)}
              </span>
            )}
          </div>

          {!outOfStock &&
            (inCart ? (
              <div
                className="flex items-center justify-center gap-3 rounded-xl bg-[#FF3F6C] py-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[20px] text-center text-sm font-bold text-white">
                  {inCart.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#FF3F6C]"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAdd()
                }}
                className="w-full rounded-xl bg-gradient-to-r from-[#FF3F6C] to-[#FF6B9D] py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-[0_4px_14px_rgba(255,63,108,0.3)] transition active:scale-[0.98]"
              >
                ADD / {optionCount} options available
              </button>
            ))}
        </div>
      </article>
    )
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={openProductDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openProductDetail()
        }
      }}
      className={cn(
        'group relative flex cursor-pointer flex-col rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md',
        className,
      )}
    >
      {/* LIVE ECOSYSTEM UPGRADE — standardized square product image */}
      <div className="relative mb-2 overflow-visible">
        <ProductImage
          src={product.image}
          alt={product.name}
          fallback={placeholder.emoji}
          className={cn('transition-transform duration-200 group-hover:scale-[1.02]', placeholder.bg)}
          eager={eagerImage}
        />

        {originalPrice && discount > 0 && !outOfStock && (
          <span className="absolute left-2 top-2 rounded-md bg-[#0C831F] px-1.5 py-0.5 text-[9px] font-bold text-white">
            {discount}% OFF
          </span>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 text-xs font-bold text-white">
            Out of Stock
          </div>
        )}

        {/* Zepto-style floating ADD / quantity control */}
        {!outOfStock &&
          (inCart ? (
            <div className="absolute -bottom-2 -right-1 z-10 flex items-center gap-0.5 rounded-xl border border-pink-200 bg-white px-1 py-1 shadow-md">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  updateQuantity(product.id, inCart.quantity - 1)
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#E42575] transition active:scale-95"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[18px] text-center text-sm font-bold text-[#E42575]">
                {inCart.quantity}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  updateQuantity(product.id, inCart.quantity + 1)
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E42575] text-white transition active:scale-95"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleAdd()
              }}
              className="absolute -bottom-2 -right-1 z-10 flex items-center justify-center gap-1 rounded-xl border border-pink-200 bg-white px-4 py-1.5 text-sm font-bold text-[#E42575] shadow-md transition-all hover:bg-pink-50 active:scale-95"
              aria-label={`Add ${product.name} to cart`}
            >
              <span>ADD</span>
              <span className="text-lg font-normal leading-none">+</span>
            </button>
          ))}
      </div>

      {/* Product info */}
      <div className="flex flex-1 flex-col pt-1">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight text-gray-800">
          {product.name}
        </h3>

        <span className="mt-0.5 block text-xs text-gray-400">{sizeLabel}</span>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-base font-bold text-gray-900">
            {formatCurrency(product.price)}
          </span>
          {originalPrice && (
            <span className="text-xs text-gray-400 line-through">
              {formatCurrency(originalPrice)}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
