'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Navigation, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  addressLabelDisplay,
  formatCustomerAddress,
  type CustomerAddressRecord,
} from '@/lib/customer-address'

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const scrollY = window.scrollY
    const { style } = document.body
    const prev = { overflow: style.overflow, position: style.position, top: style.top, width: style.width }
    style.overflow = 'hidden'
    style.position = 'fixed'
    style.top = `-${scrollY}px`
    style.width = '100%'
    return () => {
      style.overflow = prev.overflow
      style.position = prev.position
      style.top = prev.top
      style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [locked])
}

export function ConfirmDeliveryLocationModal({
  open,
  address,
  grandTotal,
  paymentLabel,
  isPlacing,
  onConfirm,
  onChangeAddress,
  onClose,
}: {
  open: boolean
  address: CustomerAddressRecord | null
  grandTotal: number
  paymentLabel: string
  isPlacing: boolean
  onConfirm: () => void
  onChangeAddress: () => void
  onClose: () => void
}) {
  const titleId = useId()
  const descId = useId()
  const confirmRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)

  useBodyScrollLock(open && mounted)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => confirmRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPlacing) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, isPlacing, onClose])

  if (!mounted || !open || !address) return null

  const fullAddress = formatCustomerAddress(address)
  const label = addressLabelDisplay(address)

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        aria-label="Dismiss confirmation"
        className="absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-[2px]"
        onClick={() => !isPlacing && onClose()}
        disabled={isPlacing}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          'relative z-[211] w-full max-w-md overflow-hidden',
          'rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem]',
          'animate-slide-up motion-reduce:animate-none',
          'pb-[max(1rem,env(safe-area-inset-bottom))]',
        )}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#E8E8E8] sm:hidden" />

        {!isPlacing && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="px-5 pb-5 pt-7 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF8F5] text-[#FF6B35]">
              <Navigation className="h-6 w-6" />
            </span>
            <div className="min-w-0 pr-6">
              <h2 id={titleId} className="text-lg font-black text-slate-900">
                Confirm delivery location
              </h2>
              <p id={descId} className="mt-1.5 text-sm text-slate-500">
                Your order will be delivered to the address below. Please verify it&apos;s correct.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border-2 border-[#FF6B35]/20 bg-[#FFF8F5] p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[#FF6B35]" />
              <span className="text-xs font-black uppercase tracking-widest text-[#FF6B35]">
                {label}
              </span>
            </div>
            <p className="mt-2 text-sm font-bold leading-relaxed text-slate-900">{fullAddress}</p>
            <p className="mt-2 text-[10px] font-semibold text-slate-400">
              GPS: {address.latitude.toFixed(5)}, {address.longitude.toFixed(5)}
            </p>
          </div>

          <p className="mt-4 text-center text-xs font-semibold text-slate-500">
            Total payable: <span className="font-black text-slate-900">₹{grandTotal}</span>
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              disabled={isPlacing}
              className="w-full rounded-2xl bg-[#FF6B35] py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-[#FF6B35]/25 disabled:opacity-70"
            >
              {isPlacing ? 'Processing payment…' : `Yes, deliver here · ${paymentLabel}`}
            </button>
            <button
              type="button"
              onClick={onChangeAddress}
              disabled={isPlacing}
              className="w-full rounded-2xl border border-slate-200 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Change address
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
