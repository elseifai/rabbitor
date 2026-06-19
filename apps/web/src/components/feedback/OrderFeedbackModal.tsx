'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Store, Truck, X } from 'lucide-react'
import { StarRating } from '@/components/feedback/StarRating'
import { getAuthHeader } from '@/lib/session'
import { cn } from '@/lib/utils'

type OrderFeedbackModalProps = {
  open: boolean
  orderId: string
  shopName?: string
  riderName?: string | null
  onClose?: () => void
  onSubmitted?: () => void
}

export function OrderFeedbackModal({
  open,
  orderId,
  shopName = 'this store',
  riderName,
  onClose,
  onSubmitted,
}: OrderFeedbackModalProps) {
  const [shopRating, setShopRating] = useState(0)
  const [riderRating, setRiderRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setShopRating(0)
    setRiderRating(0)
    setComment('')
    setDone(false)
    setError(null)
  }, [open, orderId])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const submit = async () => {
    if (shopRating < 1 || riderRating < 1) {
      setError('Please rate both your order and delivery experience.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          orderId,
          shopRating,
          riderRating,
          comment: comment.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(typeof json.error === 'string' ? json.error : 'Could not submit feedback')
        return
      }
      setDone(true)
      onSubmitted?.()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close feedback"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className={cn(
          'relative w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl',
          'animate-in slide-in-from-bottom-4 duration-300',
        )}
      >
        <div className="bg-gradient-to-br from-[#FF6B35] to-[#FF8C61] px-6 pb-8 pt-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                Rate your experience
              </p>
              <h2 id="feedback-title" className="mt-1 text-xl font-black">
                {done ? 'Thank you!' : 'How did we do?'}
              </h2>
              <p className="mt-1 text-sm text-white/85">
                {done
                  ? 'Your feedback helps stores and riders improve.'
                  : 'Your ratings map directly to store & rider performance.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/20 p-2 hover:bg-white/30"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              ✓
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">
              Feedback submitted successfully
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-[#0C831F] py-3 text-sm font-bold text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-5 px-6 py-6">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-[#FF6B35]" />
                <p className="text-sm font-bold text-slate-900">Order & products</p>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                How was your experience at {shopName}?
              </p>
              <div className="mt-3 flex justify-center">
                <StarRating value={shopRating} onChange={setShopRating} size="lg" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#0C831F]" />
                <p className="text-sm font-bold text-slate-900">Delivery</p>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {riderName
                  ? `How was ${riderName}'s delivery?`
                  : 'How was your delivery experience?'}
              </p>
              <div className="mt-3 flex justify-center">
                <StarRating value={riderRating} onChange={setRiderRating} size="lg" />
              </div>
            </div>

            <label className="block">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <MessageSquare className="h-3.5 w-3.5" />
                Optional comment
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Tell us what stood out — quality, packaging, speed…"
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
              />
              <p className="mt-1 text-right text-[10px] text-slate-400">{comment.length}/500</p>
            </label>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={loading || shopRating < 1 || riderRating < 1}
              onClick={() => void submit()}
              className="w-full rounded-xl bg-[#FF6B35] py-3.5 text-sm font-black text-white shadow-lg shadow-orange-200/60 disabled:opacity-50"
            >
              {loading ? 'Submitting…' : 'Submit feedback'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
