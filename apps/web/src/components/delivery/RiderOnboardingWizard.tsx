'use client'

import { useState } from 'react'
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { submitRiderOnboardingAction, type RiderProfileForm } from '@/actions/rider-onboarding'
import type { RiderVehicleType } from '@rabbit/database'
import { cn } from '@/lib/utils'

const STEPS = ['Personal', 'Vehicle', 'Bank'] as const
const VEHICLES: { id: RiderVehicleType; label: string; emoji: string }[] = [
  { id: 'BIKE', label: 'Bike', emoji: '🏍️' },
  { id: 'SCOOTER', label: 'Scooter', emoji: '🛵' },
  { id: 'CYCLE', label: 'Cycle', emoji: '🚲' },
]

const emptyForm: RiderProfileForm = {
  fullName: '',
  contactPhone: '',
  emergencyPhone: '',
  vehicleType: 'BIKE',
  vehiclePlate: '',
  drivingLicenseId: '',
  bankName: '',
  bankAccountNumber: '',
  ifscCode: '',
}

export function RiderOnboardingWizard({
  initial,
  onComplete,
}: {
  initial?: Partial<RiderProfileForm> | null
  onComplete: () => void
}) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<RiderProfileForm>({ ...emptyForm, ...initial })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof RiderProfileForm>(key: K, value: RiderProfileForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const next = () => {
    setError(null)
    if (step === 0) {
      if (form.fullName.trim().length < 2) return setError('Enter your full name.')
      if (form.contactPhone.replace(/\D/g, '').length < 10) return setError('Enter a valid contact number.')
      if (form.emergencyPhone.replace(/\D/g, '').length < 10) return setError('Enter an emergency contact number.')
    }
    if (step === 1) {
      if (!form.vehiclePlate.trim()) return setError('Enter your vehicle plate number.')
      if (!form.drivingLicenseId.trim()) return setError('Enter your driving license ID.')
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const submit = async () => {
    setError(null)
    setLoading(true)
    const res = await submitRiderOnboardingAction(form)
    setLoading(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    onComplete()
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-2xl text-white shadow-lg shadow-orange-200">
          🛵
        </div>
        <h1 className="mt-4 text-2xl font-black text-gray-900">Rider profile setup</h1>
        <p className="mt-1 text-sm text-gray-500">Complete your partner profile to start earning</p>
      </div>

      <div className="mb-6 flex gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={cn(
                'h-1.5 rounded-full transition-colors',
                i <= step ? 'bg-orange-500' : 'bg-orange-100',
              )}
            />
            <p className={cn('mt-1 text-[10px] font-bold uppercase', i === step ? 'text-orange-600' : 'text-gray-400')}>
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Full name" value={form.fullName} onChange={(v) => set('fullName', v)} placeholder="Rajesh Kumar" />
            <Field label="Contact number" value={form.contactPhone} onChange={(v) => set('contactPhone', v)} placeholder="9876543210" inputMode="tel" />
            <Field label="Emergency phone" value={form.emergencyPhone} onChange={(v) => set('emergencyPhone', v)} placeholder="9123456789" inputMode="tel" />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vehicle type</p>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => set('vehicleType', v.id)}
                  className={cn(
                    'rounded-2xl border-2 px-2 py-3 text-center transition',
                    form.vehicleType === v.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-orange-100 bg-white',
                  )}
                >
                  <span className="text-xl">{v.emoji}</span>
                  <p className="mt-1 text-xs font-bold text-gray-800">{v.label}</p>
                </button>
              ))}
            </div>
            <Field label="Registration plate" value={form.vehiclePlate} onChange={(v) => set('vehiclePlate', v)} placeholder="MH 12 AB 1234" />
            <Field
              label="Driving license ID"
              value={form.drivingLicenseId}
              onChange={(v) => set('drivingLicenseId', v)}
              placeholder="DL-XXXXXXXXXX"
              hint="Rider ID omitted from customer-facing views for compliance."
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label="Bank name" value={form.bankName} onChange={(v) => set('bankName', v)} placeholder="HDFC Bank" />
            <Field label="Account number" value={form.bankAccountNumber} onChange={(v) => set('bankAccountNumber', v)} placeholder="XXXXXXXXXXXX" inputMode="numeric" />
            <Field label="IFSC code" value={form.ifscCode} onChange={(v) => set('ifscCode', v.toUpperCase())} placeholder="HDFC0001234" />
            <div className="rounded-xl bg-orange-50/80 px-3 py-2 text-xs text-orange-800">
              Payouts are deposited weekly after verification. Keep bank details accurate.
            </div>
          </div>
        )}

        {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex h-12 flex-1 items-center justify-center gap-1 rounded-2xl border border-orange-200 text-sm font-bold text-gray-700"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="flex h-12 flex-1 items-center justify-center gap-1 rounded-2xl bg-orange-500 text-sm font-bold text-white shadow-lg shadow-orange-100"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={() => void submit()}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 text-sm font-bold text-white shadow-lg shadow-orange-100 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Finish setup
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-1.5 h-12 w-full rounded-xl border-2 border-orange-100 bg-orange-50/20 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-orange-400 focus:bg-white"
      />
      {hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
    </label>
  )
}
