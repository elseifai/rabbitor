'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { updateProductAction } from '@/actions/merchant'
import { FileUploader } from '@/components/ui/file-uploader'
import { cn } from '@/lib/utils'

export type EditableProduct = {
  id: string
  name: string
  price: number
  unit: string
  stock: number
  available: boolean
  image?: string | null
}

export function MerchantEditProductModal({
  product,
  open,
  onClose,
  onSaved,
}: {
  product: EditableProduct | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [unit, setUnit] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!product) return
    setPrice(String(product.price))
    setStock(String(product.stock))
    setUnit(product.unit)
    setImageUrl(product.image ?? null)
    setIsAvailable(product.available)
    setError(null)
  }, [product])

  if (!open || !product) return null

  const handleSave = async () => {
    const parsedPrice = parseFloat(price)
    const parsedStock = parseInt(stock, 10)
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Enter a valid selling price')
      return
    }

    setSubmitting(true)
    setError(null)
    const res = await updateProductAction({
      productId: product.id,
      price: parsedPrice,
      unit: unit.trim() || product.unit,
      stock: Number.isFinite(parsedStock) ? parsedStock : product.stock,
      isAvailable,
      imageUrl,
    })
    setSubmitting(false)

    if (!res.ok) {
      setError(res.error)
      return
    }

    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="font-black text-gray-900">Customize & Save</h3>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Edit product</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="rounded-xl border border-[#FF6B35]/20 bg-[#FFF3ED]/50 p-4">
            <p className="text-sm font-black text-gray-900">{product.name}</p>
          </div>

          <FileUploader
            value={imageUrl}
            onChange={setImageUrl}
            label="Product image"
            aspect="square"
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-500">Selling price (₹)</span>
              <input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm focus:border-[#FF6B35] focus:outline-none"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-500">Stock qty</span>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm focus:border-[#FF6B35] focus:outline-none"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase text-gray-500">Unit / weight</span>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm focus:border-[#FF6B35] focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={() => setIsAvailable((v) => !v)}
            className={cn(
              'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold',
              isAvailable
                ? 'border-green-200 bg-green-50 text-[#0C831F]'
                : 'border-gray-200 bg-gray-50 text-gray-500',
            )}
          >
            <span>Availability</span>
            <span>{isAvailable ? 'In Stock' : 'Out of Stock'}</span>
          </button>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border py-3 text-xs font-bold text-gray-600"
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSave()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save to Store
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
