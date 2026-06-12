'use client'

import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { addProductAction } from '@/actions/merchant'

// MERCHANT DASHBOARD EXPANSION — add product to operational grid
export function MerchantAddProductModal({
  shopId,
  open,
  onClose,
  onAdded,
}: {
  shopId: string
  open: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('general')
  const [price, setPrice] = useState('')
  const [weight, setWeight] = useState('1 piece')
  const [imageUrl, setImageUrl] = useState('')
  const [stock, setStock] = useState('10')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const parsedPrice = parseFloat(price)
    const parsedStock = parseInt(stock, 10)

    const res = await addProductAction({
      shopId,
      name,
      category,
      price: parsedPrice,
      unit: weight,
      stock: Number.isFinite(parsedStock) ? parsedStock : 10,
      imageUrl: imageUrl.trim() || undefined,
    })

    setSubmitting(false)
    if (!res.ok) {
      setError(res.error)
      return
    }

    setName('')
    setCategory('general')
    setPrice('')
    setWeight('1 piece')
    setImageUrl('')
    setStock('10')
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">Add Product</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Title</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              placeholder="Fresh Pomfret"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Category</span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              placeholder="seafood"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Price (₹)</span>
              <input
                type="number"
                min={1}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Weight / Unit</span>
              <input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                placeholder="500g"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Image URL</span>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              placeholder="https://..."
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Stock</span>
            <input
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add to grid
          </button>
        </form>
      </div>
    </div>
  )
}
