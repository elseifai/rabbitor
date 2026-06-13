'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, Upload, FileText } from 'lucide-react'
import {
  getMerchantSettingsAction,
  updateMerchantSettingsAction,
  toggleShopOpenAction,
} from '@/actions/merchant'
import { formatCurrency } from '@/lib/utils'
import { GeoLocationPanel } from '@/components/location/GeoLocationPanel'

type Settings = NonNullable<Awaited<ReturnType<typeof getMerchantSettingsAction>>>

const KYC_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  VERIFIED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

const KYC_DOCS = [
  { type: 'AADHAAR', label: 'Aadhaar card' },
  { type: 'GST', label: 'GST certificate' },
  { type: 'SHOP_PHOTO', label: 'Shop photo' },
] as const

export function MerchantSettingsClient() {
  const [shop, setShop] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [minOrderValue, setMinOrderValue] = useState('')
  const [baseDeliveryFee, setBaseDeliveryFee] = useState('')
  const [avgPrepMinutes, setAvgPrepMinutes] = useState('')
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('')
  const [kycUploading, setKycUploading] = useState<string | null>(null)
  const kycFileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = () => {
    getMerchantSettingsAction()
      .then((data) => {
        setShop(data)
        if (data) {
          setMinOrderValue(String(data.minOrderValue))
          setBaseDeliveryFee(String(data.baseDeliveryFee))
          setAvgPrepMinutes(String(data.avgPrepMinutes))
          setDeliveryRadiusKm(String(data.deliveryRadiusKm))
        }
      })
      .catch(() => setShop(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const uploadKyc = async (docType: string, file: File) => {
    setKycUploading(docType)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('docType', docType)
      formData.append('file', file)

      const res = await fetch('/api/vendor/kyc/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? 'Could not upload document')
        return
      }
      load()
    } catch {
      setError('Document upload failed')
    } finally {
      setKycUploading(null)
      if (kycFileRefs.current[docType]) kycFileRefs.current[docType]!.value = ''
    }
  }

  const toggleOpen = async () => {
    if (!shop) return
    const res = await toggleShopOpenAction(shop.id, !shop.isActive)
    if (res.ok) {
      setShop({ ...shop, isActive: res.isActive })
    }
  }

  const save = async () => {
    if (!shop) return
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await updateMerchantSettingsAction({
      shopId: shop.id,
      minOrderValue: parseFloat(minOrderValue) || 0,
      baseDeliveryFee: parseFloat(baseDeliveryFee) || 0,
      avgPrepMinutes: parseInt(avgPrepMinutes, 10) || 15,
      deliveryRadiusKm: parseFloat(deliveryRadiusKm) || 5,
    })

    setSaving(false)
    if (!res.ok) {
      setError(res.error ?? 'Could not save settings')
      return
    }
    setSaved(true)
    load()
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">{shop.name}</h3>
            <p className="text-sm text-gray-500">{shop.category} · /shops/{shop.slug}</p>
            <p className="mt-1 text-xs text-gray-400">{shop.address}</p>
          </div>
          <button
            type="button"
            onClick={() => void toggleOpen()}
            className={`relative h-10 w-[4.5rem] shrink-0 rounded-full transition ${
              shop.isActive ? 'bg-rabbit-600' : 'bg-gray-300'
            }`}
            aria-label="Toggle shop open"
          >
            <span
              className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow transition ${
                shop.isActive ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Shop is {shop.isActive ? 'open and accepting orders' : 'closed'}
        </p>
      </div>

      <div className="rounded-2xl border border-orange-100 bg-white p-4">
        <h3 className="font-semibold text-gray-900">Store location</h3>
        <p className="mt-1 text-sm text-gray-500">
          Pin your shop on the map so customers and riders can navigate precisely
        </p>
        <div className="mt-4">
          <GeoLocationPanel compact />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Current: {shop.latitude.toFixed(5)}, {shop.longitude.toFixed(5)}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">KYC Documents</h3>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
              KYC_BADGE[shop.kycStatus] ?? KYC_BADGE.PENDING
            }`}
          >
            {shop.kycStatus}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Upload verification documents for admin review
        </p>

        <div className="mt-4 space-y-3">
          {KYC_DOCS.map((doc) => {
            const existing = shop.kycDocuments.find((d) => d.docType === doc.type)
            return (
              <div
                key={doc.type}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{doc.label}</p>
                    {existing && (
                      <a
                        href={existing.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-rabbit-600 underline"
                      >
                        View uploaded file
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <input
                    ref={(el) => {
                      kycFileRefs.current[doc.type] = el
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void uploadKyc(doc.type, f)
                    }}
                  />
                  <button
                    type="button"
                    disabled={kycUploading === doc.type}
                    onClick={() => kycFileRefs.current[doc.type]?.click()}
                    className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rabbit-700 ring-1 ring-rabbit-200 disabled:opacity-50"
                  >
                    {kycUploading === doc.type ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    {existing ? 'Replace' : 'Upload'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <h3 className="font-semibold text-gray-900">Delivery settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          These values affect customer checkout and delivery quotes
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Minimum order (₹)</span>
            <input
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Base delivery fee (₹)</span>
            <input
              value={baseDeliveryFee}
              onChange={(e) => setBaseDeliveryFee(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Avg prep time (mins)</span>
            <input
              value={avgPrepMinutes}
              onChange={(e) => setAvgPrepMinutes(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Delivery radius (km)</span>
            <input
              value={deliveryRadiusKm}
              onChange={(e) => setDeliveryRadiusKm(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-gray-400">
          Current min order: {formatCurrency(shop.minOrderValue)} · Fee:{' '}
          {formatCurrency(shop.baseDeliveryFee)}
        </p>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {saved && (
          <p className="mt-3 rounded-lg bg-rabbit-50 px-3 py-2 text-sm text-rabbit-700">
            Settings saved successfully.
          </p>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rabbit-600 py-3 font-semibold text-white disabled:opacity-40 sm:w-auto sm:px-8"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save settings
        </button>
      </div>
    </div>
  )
}
