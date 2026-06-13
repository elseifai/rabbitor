'use client'

import { useState } from 'react'
import { Loader2, MapPin, Navigation } from 'lucide-react'
import { useLocationStore } from '@/store'
import { SAVED_LOCATIONS } from '@/lib/constants'
import {
  detectAndSaveLocation,
  saveManualAddress,
} from '@/lib/geolocation-service'
import { gpsHttpHint } from '@/lib/permission-prime'
import { cn } from '@/lib/utils'

// GOOGLE MAPS & AUTH ACTIVATION — GPS detect with Prisma sync
export function GeoLocationPanel({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  const formattedAddress = useLocationStore((s) => s.formattedAddress)
  const isFetching = useLocationStore((s) => s.isFetching)
  const error = useLocationStore((s) => s.error)
  const [showManual, setShowManual] = useState(false)
  const [manualAddress, setManualAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [gpsHint, setGpsHint] = useState<string | null>(null)

  const handleDetect = async () => {
    const res = await detectAndSaveLocation({ syncDb: true })
    if (!res.ok && res.showManualFallback) {
      setGpsHint(res.httpBlocked ? gpsHttpHint() : res.error ?? gpsHttpHint())
      setShowManual(true)
    }
  }

  const handleManualSave = async () => {
    if (!manualAddress.trim()) return
    setSaving(true)
    await saveManualAddress({ address: manualAddress.trim(), syncDb: true })
    setSaving(false)
    setShowManual(false)
    setManualAddress('')
    setGpsHint(null)
  }

  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white p-4', className)}>
      {!compact && (
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#FF6B35]" />
          <p className="text-sm font-bold text-gray-900">Delivery location</p>
        </div>
      )}

      {formattedAddress && (
        <p className="mb-3 text-sm text-gray-600">{formattedAddress}</p>
      )}

      <button
        type="button"
        onClick={() => void handleDetect()}
        disabled={isFetching}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {isFetching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Navigation className="h-4 w-4" />
        )}
        Detect Live Location
      </button>

      {error && !showManual && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="mt-2 w-full text-center text-xs font-semibold text-orange-500 hover:underline"
      >
        {showManual ? 'Hide manual entry' : 'Enter address manually'}
      </button>

      <div
        className={cn(
          'grid transition-all duration-500 ease-out',
          showManual ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-3 space-y-3 border-t border-orange-100 pt-3">
            {gpsHint && (
              <p className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-medium text-orange-800">
                {gpsHint}
              </p>
            )}
            <textarea
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              rows={2}
              placeholder="Flat / building, street, area, city"
              className="w-full rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
            />
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase text-gray-400">Quick picks</p>
              {SAVED_LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => void saveManualAddress({
                    address: `${loc.label} — ${loc.area}`,
                    lat: loc.latitude,
                    lng: loc.longitude,
                  })}
                  className="block w-full rounded-lg border border-orange-50 px-3 py-2 text-left text-xs hover:bg-orange-50/50"
                >
                  <span className="font-semibold text-gray-800">{loc.label}</span>
                  <span className="block text-gray-500">{loc.area}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={saving || !manualAddress.trim()}
              onClick={() => void handleManualSave()}
              className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save custom address'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
