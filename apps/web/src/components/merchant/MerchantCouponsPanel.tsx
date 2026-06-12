'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Percent, Tag } from 'lucide-react'
import { createShopCouponAction } from '@/actions/merchant'

type CouponRow = {
  id: string
  code: string
  discountType: string
  discountValue: number
  minOrderValue: number
  isActive: boolean
  expiresAt: string | null
}

// MERCHANT DASHBOARD EXPANSION — offers & coupons engine
export function MerchantCouponsPanel() {
  const [coupons, setCoupons] = useState<CouponRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState('')
  const [offerType, setOfferType] = useState<'FLAT' | 'PERCENT' | 'FREE_DELIVERY'>('FLAT')
  const [discountValue, setDiscountValue] = useState('')
  const [minOrderValue, setMinOrderValue] = useState('199')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCoupons = useCallback(async () => {
    try {
      const res = await fetch('/api/merchant/coupons')
      const json = await res.json()
      if (json.success) setCoupons(json.coupons ?? [])
    } catch {
      setCoupons([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCoupons()
  }, [loadCoupons])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const res = await createShopCouponAction({
      code,
      offerType,
      discountValue: parseFloat(discountValue) || 0,
      minOrderValue: parseFloat(minOrderValue) || 0,
    })

    setSubmitting(false)
    if (!res.ok) {
      setError(res.error)
      return
    }

    setCode('')
    setDiscountValue('')
    setShowForm(false)
    void loadCoupons()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
          <Tag className="h-3.5 w-3.5 text-[#FF6B35]" /> Offers & Coupons
        </h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-[#FF6B35]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#FF6B35]"
        >
          {showForm ? 'Cancel' : '+ New offer'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <div className="grid grid-cols-3 gap-2">
            {(['FLAT', 'PERCENT', 'FREE_DELIVERY'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setOfferType(type)}
                className={`rounded-xl border py-2 text-[10px] font-black uppercase tracking-wider ${
                  offerType === type
                    ? 'border-[#FF6B35] bg-[#FFF3ED] text-[#FF6B35]'
                    : 'border-slate-200 text-slate-500'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="COUPON CODE"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold uppercase focus:border-[#FF6B35] focus:outline-none"
          />

          {offerType !== 'FREE_DELIVERY' && (
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={offerType === 'PERCENT' ? 'Discount %' : 'Flat ₹ off'}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
            />
          )}

          <input
            type="number"
            value={minOrderValue}
            onChange={(e) => setMinOrderValue(e.target.value)}
            placeholder="Min order value ₹"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0C831F] py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Percent className="h-4 w-4" />}
            Create coupon
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : coupons.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
          No store coupons yet. Create flat, percentage, or free-delivery offers.
        </p>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3"
            >
              <div>
                <p className="text-xs font-black text-slate-900">{c.code}</p>
                <p className="text-[10px] font-semibold text-slate-500">
                  {c.discountType === 'PERCENT'
                    ? `${c.discountValue}% off`
                    : c.discountValue === 0
                      ? 'Free delivery'
                      : `₹${c.discountValue} off`}{' '}
                  · min ₹{c.minOrderValue}
                </p>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${
                  c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {c.isActive ? 'Active' : 'Off'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
