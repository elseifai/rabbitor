'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Store } from 'lucide-react'

const STORE_TYPES = [
  'KIRANA',
  'FISH',
  'VEGETABLE',
  'PHARMACY',
  'BAKERY',
  'DAIRY',
  'MEAT',
  'GENERAL',
] as const

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

type StoreType = (typeof STORE_TYPES)[number]
type DayKey = (typeof WEEKDAYS)[number]

type OpeningHours = Record<DayKey, { open: string; close: string }>

type FormData = {
  name: string
  storeType: StoreType
  description: string
  address: string
  latitude: string
  longitude: string
  deliveryRadiusKm: number
  minOrderValue: string
  baseDeliveryFee: string
  openingHours: OpeningHours
}

const defaultHours = (): OpeningHours =>
  Object.fromEntries(
    WEEKDAYS.map((day) => [day, { open: '09:00', close: '21:00' }]),
  ) as OpeningHours

export default function MerchantOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({
    name: '',
    storeType: 'GENERAL',
    description: '',
    address: '',
    latitude: '19.1364',
    longitude: '72.8296',
    deliveryRadiusKm: 5,
    minOrderValue: '99',
    baseDeliveryFee: '25',
    openingHours: defaultHours(),
  })

  const progress = (step / 3) * 100

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const canContinueStep1 = form.name.trim().length > 0 && form.description.trim().length > 0
  const canContinueStep2 =
    form.address.trim().length > 0 &&
    !Number.isNaN(parseFloat(form.latitude)) &&
    !Number.isNaN(parseFloat(form.longitude))

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          storeType: form.storeType,
          description: form.description.trim(),
          address: form.address.trim(),
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          deliveryRadiusKm: form.deliveryRadiusKm,
          minOrderValue: parseFloat(form.minOrderValue) || 0,
          deliveryFee: parseFloat(form.baseDeliveryFee) || 0,
          openingHours: form.openingHours,
        }),
      })

      const json = await response.json()
      if (!json.success) {
        setError(typeof json.error === 'string' ? json.error : 'Could not create store')
        return
      }

      router.push('/merchant')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/merchant"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-rabbit-600">
                Store onboarding
              </p>
              <h1 className="font-display text-lg font-bold text-gray-900">Step {step} of 3</h1>
            </div>
            <Store className="h-6 w-6 text-rabbit-600" />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-rabbit-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {step === 1 && (
          <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Shop info</h2>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">Shop name</span>
              <input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-rabbit-500 focus:outline-none"
                placeholder="Masoli House"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">Store type</span>
              <select
                value={form.storeType}
                onChange={(e) => updateField('storeType', e.target.value as StoreType)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-rabbit-500 focus:outline-none"
              >
                {STORE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-rabbit-500 focus:outline-none"
                placeholder="Fresh seafood and daily essentials"
              />
            </label>
            <button
              type="button"
              disabled={!canContinueStep1}
              onClick={() => setStep(2)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rabbit-600 py-3 text-sm font-bold text-white disabled:bg-gray-300"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Location & hours</h2>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">Address</span>
              <input
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-rabbit-500 focus:outline-none"
                placeholder="Andheri West, Mumbai"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Latitude</span>
                <input
                  value={form.latitude}
                  onChange={(e) => updateField('latitude', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-rabbit-500 focus:outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Longitude</span>
                <input
                  value={form.longitude}
                  onChange={(e) => updateField('longitude', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-rabbit-500 focus:outline-none"
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-700">
                Delivery radius: {form.deliveryRadiusKm} km
              </span>
              <input
                type="range"
                min={1}
                max={10}
                value={form.deliveryRadiusKm}
                onChange={(e) => updateField('deliveryRadiusKm', Number(e.target.value))}
                className="w-full accent-rabbit-600"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Min order (₹)</span>
                <input
                  value={form.minOrderValue}
                  onChange={(e) => updateField('minOrderValue', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-rabbit-500 focus:outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Delivery fee (₹)</span>
                <input
                  value={form.baseDeliveryFee}
                  onChange={(e) => updateField('baseDeliveryFee', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-rabbit-500 focus:outline-none"
                />
              </label>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Opening hours</p>
              {WEEKDAYS.map((day) => (
                <div key={day} className="grid grid-cols-[60px_1fr_1fr] items-center gap-2 text-sm">
                  <span className="font-semibold uppercase text-gray-500">{day}</span>
                  <input
                    type="time"
                    value={form.openingHours[day].open}
                    onChange={(e) =>
                      updateField('openingHours', {
                        ...form.openingHours,
                        [day]: { ...form.openingHours[day], open: e.target.value },
                      })
                    }
                    className="rounded-lg border border-gray-200 px-2 py-1.5"
                  />
                  <input
                    type="time"
                    value={form.openingHours[day].close}
                    onChange={(e) =>
                      updateField('openingHours', {
                        ...form.openingHours,
                        [day]: { ...form.openingHours[day], close: e.target.value },
                      })
                    }
                    className="rounded-lg border border-gray-200 px-2 py-1.5"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!canContinueStep2}
                onClick={() => setStep(3)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rabbit-600 py-3 text-sm font-bold text-white disabled:bg-gray-300"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Review & submit</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <dt className="text-gray-500">Shop name</dt>
                <dd className="font-semibold text-gray-900">{form.name}</dd>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <dt className="text-gray-500">Type</dt>
                <dd className="font-semibold text-gray-900">{form.storeType}</dd>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <dt className="text-gray-500">Description</dt>
                <dd className="max-w-[60%] text-right font-semibold text-gray-900">
                  {form.description}
                </dd>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <dt className="text-gray-500">Address</dt>
                <dd className="max-w-[60%] text-right font-semibold text-gray-900">
                  {form.address}
                </dd>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <dt className="text-gray-500">Coordinates</dt>
                <dd className="font-semibold text-gray-900">
                  {form.latitude}, {form.longitude}
                </dd>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <dt className="text-gray-500">Delivery radius</dt>
                <dd className="font-semibold text-gray-900">{form.deliveryRadiusKm} km</dd>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <dt className="text-gray-500">Min order / fee</dt>
                <dd className="font-semibold text-gray-900">
                  ₹{form.minOrderValue} / ₹{form.baseDeliveryFee}
                </dd>
              </div>
            </dl>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700"
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rabbit-600 py-3 text-sm font-bold text-white disabled:bg-gray-400"
              >
                {submitting ? 'Submitting…' : (
                  <>
                    <Check className="h-4 w-4" /> Create store
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
