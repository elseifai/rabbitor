'use client'

import { useState } from 'react'
import { MapPin, Navigation, ChevronDown, Check, Loader2 } from 'lucide-react'
import { useLocationStore } from '@/store'
import { SAVED_LOCATIONS } from '@/lib/constants'
import { detectAndSaveLocation, saveManualAddress } from '@/lib/geolocation-service'
import { cn } from '@/lib/utils'

export function LocationPicker() {
  const formattedAddress = useLocationStore((s) => s.formattedAddress)
  const coordinates = useLocationStore((s) => s.coordinates)
  const isFetching = useLocationStore((s) => s.isFetching)
  const setLocation = useLocationStore((s) => s.setLocation)
  const setFetching = useLocationStore((s) => s.setFetching)
  const setPermission = useLocationStore((s) => s.setPermission)
  const setError = useLocationStore((s) => s.setError)

  const [pincode, setPincode] = useState('')
  const [expanded, setExpanded] = useState(!formattedAddress)

  const detectLocation = async () => {
    const res = await detectAndSaveLocation({ syncDb: true })
    if (res.ok) setExpanded(false)
  }

  const applyPincode = async () => {
    if (pincode.length < 6) return
    await saveManualAddress({
      address: `Pincode ${pincode}`,
      lat: 19.1364,
      lng: 72.8296,
    })
    setExpanded(false)
  }

  const isSelected = (lat: number, lng: number) =>
    coordinates?.lat === lat && coordinates?.lng === lng

  return (
    <div
      id="location-picker"
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rabbit-50 text-rabbit-600">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Deliver to
            </p>
            {formattedAddress ? (
              <p className="font-semibold text-gray-900">{formattedAddress}</p>
            ) : (
              <p className="text-sm text-gray-500">Set location to see nearby shops</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          aria-expanded={expanded}
        >
          <ChevronDown className={cn('h-5 w-5 transition', expanded && 'rotate-180')} />
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 animate-fade-in">
          <button
            type="button"
            onClick={detectLocation}
            disabled={isFetching}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rabbit-200 bg-rabbit-50 py-3 text-sm font-semibold text-rabbit-700 transition hover:bg-rabbit-100 disabled:opacity-60"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            Detect Live Location
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-rabbit-500 focus:ring-2 focus:ring-rabbit-500/20"
            />
            <button
              type="button"
              onClick={applyPincode}
              disabled={pincode.length !== 6}
              className="rounded-xl bg-rabbit-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rabbit-700 disabled:opacity-40"
            >
              Apply
            </button>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">Saved addresses</p>
            <div className="space-y-2">
              {SAVED_LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    setLocation(
                      loc.latitude,
                      loc.longitude,
                      `${loc.label} — ${loc.area}`,
                    )
                    setExpanded(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition',
                    isSelected(loc.latitude, loc.longitude)
                      ? 'border-rabbit-300 bg-rabbit-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50',
                  )}
                >
                  <span>
                    <span className="font-medium text-gray-900">{loc.label}</span>
                    <span className="block text-xs text-gray-500">{loc.area}</span>
                  </span>
                  {isSelected(loc.latitude, loc.longitude) && (
                    <Check className="h-4 w-4 text-rabbit-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
