'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  PlusCircle,
  Store,
  MapPin,
  Sparkles,
  Clock,
  Phone,
} from 'lucide-react'
import { FileUploader } from '@/components/ui/file-uploader'

const CATEGORY_PRESETS = [
  'Kirana',
  'Fish Shop',
  'Footwear',
  'Vegetables',
  'Pharmacy',
  'Clothing',
]

export default function OnboardNewStore() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successSlug, setSuccessSlug] = useState<string | null>(null)
  const [productCount, setProductCount] = useState(0)

  const [storeImage, setStoreImage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    cuisine: '',
    location: '',
    time: '15-25 mins',
    ownerPhone: '9876543210',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccessSlug(null)

    try {
      const res = await fetch('/api/admin/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, image: storeImage ?? '' }),
      })

      const json = await res.json()

      if (res.status === 401) {
        router.push('/admin/login?redirect=/admin/new-store')
        return
      }

      if (json.success) {
        setSuccessSlug(json.slug ?? null)
        setProductCount(json.productCount ?? 0)
      } else {
        setError(json.error || 'Something went sideways.')
      }
    } catch {
      setError('Failed connecting with infrastructure gateway handles.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-xl bg-[#F8FAFC] pb-24 font-sans text-slate-900 antialiased shadow-2xl">
      <div className="sticky top-0 z-40 flex items-center gap-4 bg-slate-950 px-5 py-5 text-white shadow-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-sm font-black uppercase tracking-tight">Onboard Shop</h1>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Expand Marketplace Range
          </p>
        </div>
      </div>

      <div className="p-5">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-5 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm"
        >
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs font-bold text-red-800">
              {error}
            </div>
          )}

          {successSlug && (
            <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-black text-emerald-900">Vendor node registered in PostgreSQL</p>
              <p className="text-[11px] font-semibold leading-relaxed text-emerald-800">
                {productCount} starter SKUs seeded · visible on home feed · cart & checkout ready
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/"
                  className="rounded-xl bg-white py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-[#FF6B35] shadow-sm"
                >
                  View Home Feed →
                </Link>
                <Link
                  href={`/shops/${successSlug}`}
                  className="rounded-xl bg-[#FF6B35] py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white shadow-sm"
                >
                  Open Catalog →
                </Link>
              </div>
              <Link
                href="/admin"
                className="block text-center text-[10px] font-bold text-emerald-700 underline"
              >
                Back to Super-Admin dashboard
              </Link>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-slate-400">
              <Store className="h-3.5 w-3.5 text-[#FF6B35]" /> Vendor Brand Name
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Balaji Premium Kirana Mart"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold transition focus:border-[#FF6B35] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-[#FF6B35]" /> Operational Category Tags
            </label>
            <input
              type="text"
              name="cuisine"
              required
              value={formData.cuisine}
              onChange={handleChange}
              placeholder="e.g., Kirana, Staples, Household Essentials"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold transition focus:border-[#FF6B35] focus:outline-none"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {CATEGORY_PRESETS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, cuisine: tag }))}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition hover:border-[#FF6B35]/40 hover:text-[#FF6B35]"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-[#FF6B35]" /> Base Dispatch Hub Address
            </label>
            <input
              type="text"
              name="location"
              required
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Sector 4 Arcade, Main Market Block"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold transition focus:border-[#FF6B35] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-slate-400">
              <Clock className="h-3.5 w-3.5 text-[#FF6B35]" /> Target Transit ETA Time
            </label>
            <input
              type="text"
              name="time"
              value={formData.time}
              onChange={handleChange}
              placeholder="e.g., 15-25 mins"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold transition focus:border-[#FF6B35] focus:outline-none"
            />
          </div>

          <FileUploader
            value={storeImage}
            onChange={setStoreImage}
            label="Store showcase photo (optional)"
            aspect="video"
          />

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-slate-400">
              <Phone className="h-3.5 w-3.5 text-[#FF6B35]" /> Merchant Owner Phone
            </label>
            <input
              type="tel"
              name="ownerPhone"
              value={formData.ownerPhone}
              onChange={handleChange}
              placeholder="9876543210"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold transition focus:border-[#FF6B35] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-4 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#FF6B35]/10 transition duration-200 active:scale-[0.99] disabled:bg-slate-300"
          >
            <PlusCircle className="h-4 w-4" />
            {isSubmitting ? 'Registering Node...' : 'Onboard Storefront'}
          </button>

          <p className="text-center text-[10px] font-semibold text-slate-400">
            Not logged in?{' '}
            <Link href="/admin/login" className="font-bold text-[#FF6B35] underline">
              Admin login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
