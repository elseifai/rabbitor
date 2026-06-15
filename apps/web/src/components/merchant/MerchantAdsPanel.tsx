'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import type { AdPlacement } from '@rabbit/database'
import { FileUploader } from '@/components/ui/file-uploader'

const PLACEMENTS: AdPlacement[] = ['SHOP_PAGE', 'HOME_STRIP', 'CART_PAGE']

export function MerchantAdsPanel() {
  const [ads, setAds] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [placement, setPlacement] = useState<AdPlacement>('SHOP_PAGE')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/merchant/ads')
    const json = await res.json()
    if (json.success) setAds(json.ads ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageUrl) {
      setError('Upload a banner image')
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/merchant/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, imageUrl, linkUrl, placement }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!json.success) {
      setError(json.error ?? 'Failed')
      return
    }
    setTitle('')
    setImageUrl(null)
    setLinkUrl('')
    setShowForm(false)
    void load()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Local banners shown on your shop page and checkout funnel</p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 rounded-xl bg-[#FF6B35] px-4 py-2 text-xs font-black uppercase tracking-wider text-white"
        >
          <Plus className="h-4 w-4" />
          New banner
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
          <FileUploader value={imageUrl} onChange={setImageUrl} label="Banner creative" aspect="banner" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Banner title"
            required
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Deep link (optional) e.g. /shops/your-slug"
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          <select
            value={placement}
            onChange={(e) => setPlacement(e.target.value as AdPlacement)}
            className="w-full rounded-xl border px-3 py-2 text-sm"
          >
            {PLACEMENTS.map((p) => (
              <option key={p} value={p}>
                {p.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !imageUrl}
            className="w-full rounded-xl bg-[#0C831F] py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Publish banner'}
          </button>
        </form>
      )}

      {ads.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-gray-400">
          No store banners yet
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ads.map((ad) => (
            <div key={String(ad.id)} className="overflow-hidden rounded-2xl border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={String(ad.imageUrl)} alt={String(ad.title)} className="h-32 w-full object-cover" />
              <div className="p-3">
                <p className="font-bold text-gray-900">{String(ad.title)}</p>
                <p className="text-[10px] font-bold uppercase text-gray-400">{String(ad.placement)}</p>
                <span
                  className={`mt-1 inline-block rounded px-2 py-0.5 text-[9px] font-bold ${ad.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {ad.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
