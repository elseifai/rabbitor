'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Field, Toggle } from '@/components/admin/layout-builder/CategoryMatrix'
import { newId, type RiderLayoutConfig } from '@/lib/layout-config'

export function RiderGatewayTab({
  config,
  onChange,
}: {
  config: RiderLayoutConfig
  onChange: (next: RiderLayoutConfig) => void
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">
              Onboarding requirements
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Documents and steps riders must complete before going online.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                onboardingRequirements: [
                  ...config.onboardingRequirements,
                  {
                    id: newId('ro'),
                    label: 'New requirement',
                    description: '',
                    required: true,
                    sortOrder: config.onboardingRequirements.length,
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1 rounded-lg bg-[#0C831F] px-3 py-1.5 text-[10px] font-bold text-white"
          >
            <Plus className="h-3 w-3" />
            Add requirement
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {config.onboardingRequirements.map((req, i) => (
            <div key={req.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <Toggle
                  label="Required"
                  checked={req.required}
                  onChange={(v) => {
                    const next = [...config.onboardingRequirements]
                    next[i] = { ...req, required: v }
                    onChange({ ...config, onboardingRequirements: next })
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...config,
                      onboardingRequirements: config.onboardingRequirements.filter(
                        (r) => r.id !== req.id,
                      ),
                    })
                  }
                  className="text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Field
                label="Label"
                value={req.label}
                onChange={(v) => {
                  const next = [...config.onboardingRequirements]
                  next[i] = { ...req, label: v }
                  onChange({ ...config, onboardingRequirements: next })
                }}
              />
              <label className="mt-2 block text-xs">
                <span className="font-semibold text-gray-600">Description</span>
                <textarea
                  value={req.description}
                  onChange={(e) => {
                    const next = [...config.onboardingRequirements]
                    next[i] = { ...req, description: e.target.value }
                    onChange({ ...config, onboardingRequirements: next })
                  }}
                  rows={2}
                  className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm"
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">
              Regional payout bonus tiers
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Dynamic bonus ladders mapped by region and delivery volume.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                payoutTiers: [
                  ...config.payoutTiers,
                  {
                    id: newId('rp'),
                    region: 'Default',
                    minDeliveries: 5,
                    bonusAmount: 100,
                    label: 'New tier',
                    active: true,
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1 rounded-lg bg-[#FF6B35] px-3 py-1.5 text-[10px] font-bold text-white"
          >
            <Plus className="h-3 w-3" />
            Add tier
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {config.payoutTiers.map((tier, i) => (
            <div key={tier.id} className="rounded-xl border border-gray-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <Toggle
                  label="Active"
                  checked={tier.active}
                  onChange={(v) => {
                    const next = [...config.payoutTiers]
                    next[i] = { ...tier, active: v }
                    onChange({ ...config, payoutTiers: next })
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...config,
                      payoutTiers: config.payoutTiers.filter((t) => t.id !== tier.id),
                    })
                  }
                  className="text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-2">
                <Field
                  label="Tier label"
                  value={tier.label}
                  onChange={(v) => {
                    const next = [...config.payoutTiers]
                    next[i] = { ...tier, label: v }
                    onChange({ ...config, payoutTiers: next })
                  }}
                />
                <Field
                  label="Region"
                  value={tier.region}
                  onChange={(v) => {
                    const next = [...config.payoutTiers]
                    next[i] = { ...tier, region: v }
                    onChange({ ...config, payoutTiers: next })
                  }}
                />
                <Field
                  label="Min deliveries"
                  value={String(tier.minDeliveries)}
                  type="number"
                  onChange={(v) => {
                    const next = [...config.payoutTiers]
                    next[i] = { ...tier, minDeliveries: parseInt(v, 10) || 0 }
                    onChange({ ...config, payoutTiers: next })
                  }}
                />
                <Field
                  label="Bonus amount (₹)"
                  value={String(tier.bonusAmount)}
                  type="number"
                  onChange={(v) => {
                    const next = [...config.payoutTiers]
                    next[i] = { ...tier, bonusAmount: parseFloat(v) || 0 }
                    onChange({ ...config, payoutTiers: next })
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">
              Logistics announcements
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Real-time broadcasts on the rider gateway home screen.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                announcements: [
                  ...config.announcements,
                  {
                    id: newId('ra'),
                    title: 'New announcement',
                    body: '',
                    priority: 'normal',
                    active: true,
                    expiresAt: null,
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1 rounded-lg bg-[#FF6B35] px-3 py-1.5 text-[10px] font-bold text-white"
          >
            <Plus className="h-3 w-3" />
            Add announcement
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {config.announcements.length === 0 ? (
            <p className="rounded-xl border border-dashed py-8 text-center text-xs text-gray-400">
              No logistics announcements configured.
            </p>
          ) : (
            config.announcements.map((a, i) => (
              <div key={a.id} className="rounded-xl border border-gray-100 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Toggle
                    label="Active"
                    checked={a.active}
                    onChange={(v) => {
                      const next = [...config.announcements]
                      next[i] = { ...a, active: v }
                      onChange({ ...config, announcements: next })
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...config,
                        announcements: config.announcements.filter((x) => x.id !== a.id),
                      })
                    }
                    className="text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-2">
                  <Field
                    label="Title"
                    value={a.title}
                    onChange={(v) => {
                      const next = [...config.announcements]
                      next[i] = { ...a, title: v }
                      onChange({ ...config, announcements: next })
                    }}
                  />
                  <label className="block text-xs">
                    <span className="font-semibold text-gray-600">Body</span>
                    <textarea
                      value={a.body}
                      onChange={(e) => {
                        const next = [...config.announcements]
                        next[i] = { ...a, body: e.target.value }
                        onChange({ ...config, announcements: next })
                      }}
                      rows={3}
                      className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="font-semibold text-gray-600">Priority</span>
                    <select
                      value={a.priority}
                      onChange={(e) => {
                        const next = [...config.announcements]
                        next[i] = {
                          ...a,
                          priority: e.target.value as typeof a.priority,
                        }
                        onChange({ ...config, announcements: next })
                      }}
                      className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </label>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
