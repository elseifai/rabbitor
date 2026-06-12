'use client'

import { useState } from 'react'
import { Loader2, PenLine, X } from 'lucide-react'
import { addProductAction } from '@/actions/merchant'
import { ImageFilePicker } from '@/components/shared/ImageFilePicker'

// PLATFORM CORE RESOLUTION — bypass catalog; manual custom product entry
export function MerchantManualProductModal({
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
  const [category, setCategory] = useState('custom')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('1 piece')
  const [volume, setVolume] = useState('1')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [stock, setStock] = useState('10')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const reset = () => {
    setName('')
    setCategory('custom')
    setDescription('')
    setPrice('')
    setUnit('1 piece')
    setVolume('1')
    setImageUrl(null)
    setStock('10')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const parsedPrice = parseFloat(price)
    const parsedStock = parseInt(stock, 10)
    const parsedVolume = parseInt(volume, 10)

    const res = await addProductAction({
      shopId,
      name,
      category,
      description: description || `${unit} · qty ${parsedVolume || 1}`,
      price: parsedPrice,
      unit,
      stock: Number.isFinite(parsedStock) ? parsedStock : 10,
      imageUrl: imageUrl?.startsWith('http') ? imageUrl : undefined,
      imageDataUrl: imageUrl?.startsWith('data:image/') ? imageUrl : undefined,
    })

    setSubmitting(false)
    if (!res.ok) {
      setError(res.error)
      return
    }

    reset()
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-black text-slate-900">Create Custom Product Manually</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Not in our master catalog? Add your own item directly to live inventory.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Product name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
              placeholder="House special biryani"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Category</span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
              placeholder="custom"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
              placeholder="Freshly prepared, serves 2"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Stock count</span>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Weight / unit</span>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
                placeholder="500g"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Volume / pack</span>
              <input
                type="number"
                min={1}
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
              />
            </label>
          </div>

          <ImageFilePicker value={imageUrl} onChange={setImageUrl} label="Product photo" />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            Save to live inventory
          </button>
        </form>
      </div>
    </div>
  )
}
