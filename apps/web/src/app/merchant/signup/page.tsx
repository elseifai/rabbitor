'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Loader2, Store } from 'lucide-react'
import { merchantSignupAction } from '@/actions/merchant'
import { RoleGate } from '@/components/auth/RoleGate'

const BUSINESS_CATEGORIES = [
  'Cloud Kitchen',
  'Fresh Fish & Seafood',
  'Groceries / Kirana',
  'Vegetables & Fruits',
  'Pharmacy',
  'Bakery & Sweets',
  'Dairy & Eggs',
  'Meat & Poultry',
  'General Store',
] as const

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type DayKey = (typeof WEEKDAYS)[number]
type OpeningHours = Record<DayKey, { open: string; close: string }>

const defaultHours = (): OpeningHours =>
  Object.fromEntries(
    WEEKDAYS.map((day) => [day, { open: '09:00', close: '21:00' }]),
  ) as OpeningHours

// MERCHANT DASHBOARD EXPANSION — dedicated merchant registration / onboarding
export default function MerchantSignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [legalStoreName, setLegalStoreName] = useState('')
  const [businessCategory, setBusinessCategory] = useState<string>(BUSINESS_CATEGORIES[0])
  const [supportPhone, setSupportPhone] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('19.1364')
  const [longitude, setLongitude] = useState('72.8296')
  const [avgPrepMinutes, setAvgPrepMinutes] = useState('20')
  const [openingHours, setOpeningHours] = useState<OpeningHours>(defaultHours())
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [gstRef, setGstRef] = useState('')
  const [panRef, setPanRef] = useState('')
  const [fssaiRef, setFssaiRef] = useState('')
  const [aadhaarRef, setAadhaarRef] = useState('')

  const progress = (step / 4) * 100

  const step1Valid = legalStoreName.trim().length > 2 && supportPhone.replace(/\D/g, '').length >= 10
  const step2Valid =
    address.trim().length > 5 &&
    !Number.isNaN(parseFloat(latitude)) &&
    !Number.isNaN(parseFloat(longitude)) &&
    parseInt(avgPrepMinutes, 10) >= 5
  const step3Valid = bankAccountNumber.trim().length >= 8 && ifscCode.trim().length >= 11

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    const res = await merchantSignupAction({
      legalStoreName: legalStoreName.trim(),
      businessCategory,
      supportPhone: supportPhone.trim(),
      address: address.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      avgPrepMinutes: parseInt(avgPrepMinutes, 10),
      openingHours,
      bankAccountNumber: bankAccountNumber.trim(),
      ifscCode: ifscCode.trim(),
      gstRef: gstRef.trim() || undefined,
      panRef: panRef.trim() || undefined,
      fssaiRef: fssaiRef.trim() || undefined,
      aadhaarRef: aadhaarRef.trim() || undefined,
    })

    setSubmitting(false)
    if (!res.ok) {
      setError(res.error)
      return
    }

    router.push('/merchant')
    router.refresh()
  }

  return (
    <RoleGate role="VENDOR" redirectTo="/merchant/login">
      <div className="min-h-screen bg-[#F8FAFC] pb-12 font-sans">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white shadow-sm">
          <div className="mx-auto max-w-xl px-5 py-4">
            <div className="flex items-center gap-3">
              <Link
                href="/merchant"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B35]">
                  Merchant signup
                </p>
                <h1 className="text-base font-black text-slate-900">Step {step} of 4</h1>
              </div>
              <Store className="h-6 w-6 text-[#FF6B35]" />
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#FF6B35] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-xl space-y-4 p-5">
          {step === 1 && (
            <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">Business details</h2>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Legal store name
                </span>
                <input
                  value={legalStoreName}
                  onChange={(e) => setLegalStoreName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                  placeholder="Royal Coastal Seafood Pvt Ltd"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Category
                </span>
                <select
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                >
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Support contact (phone)
                </span>
                <input
                  type="tel"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                  placeholder="9876543210"
                />
              </label>
              <button
                type="button"
                disabled={!step1Valid}
                onClick={() => setStep(2)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-40"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">Operational settings</h2>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Store address
                </span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                  placeholder="Andheri West, Mumbai"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Latitude
                  </span>
                  <input
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Longitude
                  </span>
                  <input
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Avg preparation time (minutes)
                </span>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={avgPrepMinutes}
                  onChange={(e) => setAvgPrepMinutes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                />
              </label>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Operating hours
                </p>
                {WEEKDAYS.map((day) => (
                  <div key={day} className="grid grid-cols-[48px_1fr_1fr] items-center gap-2 text-xs">
                    <span className="font-bold uppercase text-slate-400">{day}</span>
                    <input
                      type="time"
                      value={openingHours[day].open}
                      onChange={(e) =>
                        setOpeningHours({
                          ...openingHours,
                          [day]: { ...openingHours[day], open: e.target.value },
                        })
                      }
                      className="rounded-lg border border-slate-200 px-2 py-1.5"
                    />
                    <input
                      type="time"
                      value={openingHours[day].close}
                      onChange={(e) =>
                        setOpeningHours({
                          ...openingHours,
                          [day]: { ...openingHours[day], close: e.target.value },
                        })
                      }
                      className="rounded-lg border border-slate-200 px-2 py-1.5"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!step2Valid}
                  onClick={() => setStep(3)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-40"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">Payout & verification</h2>
              <p className="text-xs text-slate-500">
                Bank and tax IDs are stored securely. Verification is placeholder — admin review
                sets KYC to VERIFIED.
              </p>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Bank account number
                </span>
                <input
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                  placeholder="XXXXXXXXXXXX"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  IFSC code
                </span>
                <input
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm uppercase focus:border-[#FF6B35] focus:outline-none"
                  placeholder="HDFC0001234"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    GST (optional)
                  </span>
                  <input
                    value={gstRef}
                    onChange={(e) => setGstRef(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    PAN (optional)
                  </span>
                  <input
                    value={panRef}
                    onChange={(e) => setPanRef(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    FSSAI (optional)
                  </span>
                  <input
                    value={fssaiRef}
                    onChange={(e) => setFssaiRef(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Aadhaar ref (optional)
                  </span>
                  <input
                    value={aadhaarRef}
                    onChange={(e) => setAadhaarRef(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!step3Valid}
                  onClick={() => setStep(4)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-40"
                >
                  Review <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">Review & submit</h2>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-50 py-2">
                  <dt className="text-slate-500">Store</dt>
                  <dd className="font-bold text-slate-900">{legalStoreName}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 py-2">
                  <dt className="text-slate-500">Category</dt>
                  <dd className="font-bold text-slate-900">{businessCategory}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 py-2">
                  <dt className="text-slate-500">Support</dt>
                  <dd className="font-bold text-slate-900">{supportPhone}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 py-2">
                  <dt className="text-slate-500">Location</dt>
                  <dd className="max-w-[55%] text-right font-bold text-slate-900">{address}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 py-2">
                  <dt className="text-slate-500">Prep time</dt>
                  <dd className="font-bold text-slate-900">{avgPrepMinutes} min</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Status after submit</dt>
                  <dd className="font-bold text-amber-700">PENDING_APPROVAL</dd>
                </div>
              </dl>

              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0C831F] py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Submit application
                    </>
                  )}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </RoleGate>
  )
}
