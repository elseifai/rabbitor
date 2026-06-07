'use client'

import { useEffect, useState, useRef } from 'react'
import { Camera, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import {
  getMerchantShopAction,
  addProductAction,
  toggleProductAvailabilityAction,
} from '@/actions/merchant'
import { formatCurrency } from '@/lib/utils'

type ShopData = NonNullable<Awaited<ReturnType<typeof getMerchantShopAction>>>

export function MerchantProductsClient() {
  const [shop, setShop] = useState<ShopData | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    getMerchantShopAction()
      .then(setShop)
      .catch(() => setShop(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const onPhoto = async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/api/products/upload-image', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? 'Could not upload image.')
        setImageUrl(null)
        return
      }
      setImageUrl(json.data.url as string)
    } catch {
      setError('Could not upload image. Try a smaller JPG, PNG, or WebP.')
      setImageUrl(null)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const addProduct = async () => {
    if (!shop || !name || !price) return
    const parsedPrice = parseFloat(price)
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Enter a valid price.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await addProductAction({
        shopId: shop.id,
        name: name.trim(),
        price: parsedPrice,
        unit: unit.trim() || undefined,
        imageUrl: imageUrl ?? undefined,
      })
      if (!res.ok) {
        setError(res.error ?? 'Could not add product.')
        return
      }
      setName('')
      setPrice('')
      setUnit('')
      setImageUrl(null)
      load()
    } catch {
      setError('Upload failed. If you added a photo, try a smaller image.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-rabbit-600" />
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="text-gray-600">No shop linked to this account.</p>
        <Link href="/merchant/login" className="mt-4 text-rabbit-600">
          Log in as merchant (9876543210)
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Camera className="h-4 w-4" />
          Add product (photo + price)
        </h3>
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative flex h-32 w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-rabbit-600" />
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full rounded-xl object-cover" />
            ) : (
              <span className="text-sm text-gray-500">Tap to take / upload photo</span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onPhoto(f)
            }}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product name"
            className="w-full rounded-xl border px-4 py-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price ₹"
              inputMode="decimal"
              className="rounded-xl border px-4 py-3 text-sm"
            />
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unit (1 kg, piece…)"
              className="rounded-xl border px-4 py-3 text-sm"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          <button
            type="button"
            disabled={saving || uploading || !name || !price}
            onClick={() => void addProduct()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rabbit-600 py-3 font-semibold text-white disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add to catalogue
          </button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Your products ({shop.products.length})</h3>
          <span className="text-xs text-gray-500">{shop.name}</span>
        </div>
        {shop.products.length === 0 ? (
          <p className="rounded-2xl border border-dashed py-12 text-center text-sm text-gray-500">
            No products yet. Add your first item above.
          </p>
        ) : (
          <div className="space-y-2">
            {shop.products.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-lg">📦</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-sm text-gray-500">{p.unit ?? 'piece'}</p>
                  <p className="text-sm text-rabbit-700">{formatCurrency(p.price)}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await toggleProductAvailabilityAction(p.id, !p.isAvailable)
                    load()
                  }}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    p.isAvailable
                      ? 'bg-rabbit-100 text-rabbit-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {p.isAvailable ? 'Live' : 'Off'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
