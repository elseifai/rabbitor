'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Briefcase, Home, Loader2, MapPin, Navigation, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  detectAndSaveLocation,
  reverseGeocodeDetails,
} from '@/lib/geolocation-service'
import { gpsHttpHint } from '@/lib/permission-prime'
import type { AddressLabel, CustomerAddressRecord } from '@/lib/customer-address'
import { authFetch } from '@/lib/session'

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

const LABEL_OPTIONS: { id: AddressLabel; label: string; icon: typeof Home }[] = [
  { id: 'HOME', label: 'Home', icon: Home },
  { id: 'WORK', label: 'Work', icon: Briefcase },
  { id: 'OTHER', label: 'Other', icon: MapPin },
]

export function AddAddressSheet({
  open,
  onClose,
  onSaved,
  initial,
}: {
  open: boolean
  onClose: () => void
  onSaved: (address: CustomerAddressRecord) => void
  initial?: Partial<CustomerAddressRecord>
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)

  const [label, setLabel] = useState<AddressLabel>('HOME')
  const [customLabel, setCustomLabel] = useState('')
  const [line1, setLine1] = useState('')
  const [landmark, setLandmark] = useState('')
  const [area, setArea] = useState('')
  const [city, setCity] = useState('Mumbai')
  const [pincode, setPincode] = useState('')
  const [line2, setLine2] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [detectedArea, setDetectedArea] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useBodyScrollLock(open && mounted)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setLabel(initial?.label ?? 'HOME')
    setCustomLabel(initial?.customLabel ?? '')
    setLine1(initial?.line1 ?? '')
    setLandmark(initial?.landmark ?? '')
    setArea(initial?.area ?? '')
    setCity(initial?.city ?? 'Mumbai')
    setPincode(initial?.pincode ?? '')
    setLine2(initial?.line2 ?? '')
    setLat(initial?.latitude ?? null)
    setLng(initial?.longitude ?? null)
    setDetectedArea('')
    setError(null)
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const handleDetect = useCallback(async () => {
    setDetecting(true)
    setError(null)
    const res = await detectAndSaveLocation({ syncDb: true })
    if (!res.ok) {
      setError(res.httpBlocked ? gpsHttpHint() : res.error ?? 'Could not detect location')
      setDetecting(false)
      return
    }
    const details = await reverseGeocodeDetails(res.lat, res.lng)
    setLat(res.lat)
    setLng(res.lng)
    setArea(details.area)
    setCity(details.city)
    setPincode(details.pincode ?? '')
    setLine2(details.line2 ?? '')
    setDetectedArea(details.formatted)
    setDetecting(false)
  }, [])

  const handleSave = async () => {
    if (!line1.trim()) {
      setError('Please enter house / flat / building details')
      return
    }
    if (lat == null || lng == null) {
      setError('Please detect your location or pick on map area first')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await authFetch(
        '/api/user/addresses',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label,
            customLabel: label === 'OTHER' ? customLabel : undefined,
            line1: line1.trim(),
            line2: line2.trim() || undefined,
            landmark: landmark.trim() || undefined,
            area: area.trim() || undefined,
            city: city.trim() || 'Mumbai',
            pincode: pincode.trim() || undefined,
            latitude: lat,
            longitude: lng,
            isDefault: true,
          }),
        },
        { skipLogoutRedirect: true },
      )
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? 'Could not save address')
        return
      }
      onSaved(json.data as CustomerAddressRecord)
      onClose()
    } catch {
      setError('Could not save address')
    } finally {
      setSaving(false)
    }
  }

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        aria-label="Close add address"
        className="absolute inset-0 bg-[#1C1C1C]/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative z-[201] flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden',
          'rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem]',
          'animate-slide-up motion-reduce:animate-none',
          'pb-[max(1rem,env(safe-area-inset-bottom))]',
        )}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#E8E8E8] sm:hidden" />
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id={titleId} className="text-lg font-black text-slate-900">
            Add delivery address
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <button
            type="button"
            onClick={() => void handleDetect()}
            disabled={detecting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#FF6B35]/30 bg-[#FFF8F5] py-4 text-sm font-bold text-[#FF6B35] disabled:opacity-60"
          >
            {detecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {detecting ? 'Detecting your location…' : 'Use current location (recommended)'}
          </button>

          {detectedArea && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              <MapPin className="mb-1 inline h-3.5 w-3.5" /> {detectedArea}
            </div>
          )}

          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Save as</p>
            <div className="flex gap-2">
              {LABEL_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const selected = label === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLabel(opt.id)}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-1 rounded-xl border py-3 text-xs font-bold transition',
                      selected
                        ? 'border-[#FF6B35] bg-[#FFF8F5] text-[#FF6B35]'
                        : 'border-slate-100 bg-slate-50 text-slate-600',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {label === 'OTHER' && (
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Address name (e.g. Mom's place)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold focus:border-[#FF6B35] focus:outline-none"
            />
          )}

          <div className="space-y-3">
            <input
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="House / Flat / Block No. *"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold focus:border-[#FF6B35] focus:outline-none"
            />
            <input
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Nearby landmark (optional)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold focus:border-[#FF6B35] focus:outline-none"
            />
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Area / Locality"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold focus:border-[#FF6B35] focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold focus:border-[#FF6B35] focus:outline-none"
              />
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="Pincode"
                className="w-28 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold focus:border-[#FF6B35] focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
          )}
        </div>

        <div className="border-t px-5 py-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full rounded-2xl bg-[#FF6B35] py-4 text-sm font-black uppercase tracking-wide text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & use this address'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
