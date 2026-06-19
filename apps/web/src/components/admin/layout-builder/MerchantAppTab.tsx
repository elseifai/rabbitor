'use client'

import { Plus, Trash2 } from 'lucide-react'
import { FileUploader } from '@/components/ui/file-uploader'
import { Field, Toggle } from '@/components/admin/layout-builder/CategoryMatrix'
import { newId, type MerchantLayoutConfig } from '@/lib/layout-config'

export function MerchantAppTab({
  config,
  onChange,
}: {
  config: MerchantLayoutConfig
  onChange: (next: MerchantLayoutConfig) => void
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">
              Dashboard banners
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Promotional creatives shown on the merchant home dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                banners: [
                  ...config.banners,
                  {
                    id: newId('mb'),
                    title: 'New banner',
                    subtitle: '',
                    image: null,
                    ctaLabel: 'Learn more',
                    ctaRoute: '/merchant/ads',
                    active: true,
                    sortOrder: config.banners.length,
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1 rounded-lg bg-[#FF6B35] px-3 py-1.5 text-[10px] font-bold text-white"
          >
            <Plus className="h-3 w-3" />
            Add banner
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {config.banners.map((banner, i) => (
            <div key={banner.id} className="rounded-xl border border-gray-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <Toggle
                  label="Active"
                  checked={banner.active}
                  onChange={(v) => {
                    const next = [...config.banners]
                    next[i] = { ...banner, active: v }
                    onChange({ ...config, banners: next })
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...config,
                      banners: config.banners.filter((b) => b.id !== banner.id),
                    })
                  }
                  className="text-rose-500 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <FileUploader
                value={banner.image}
                onChange={(url) => {
                  const next = [...config.banners]
                  next[i] = { ...banner, image: url }
                  onChange({ ...config, banners: next })
                }}
                label="Banner creative"
                aspect="banner"
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Field
                  label="Title"
                  value={banner.title}
                  onChange={(v) => {
                    const next = [...config.banners]
                    next[i] = { ...banner, title: v }
                    onChange({ ...config, banners: next })
                  }}
                />
                <Field
                  label="Subtitle"
                  value={banner.subtitle}
                  onChange={(v) => {
                    const next = [...config.banners]
                    next[i] = { ...banner, subtitle: v }
                    onChange({ ...config, banners: next })
                  }}
                />
                <Field
                  label="CTA label"
                  value={banner.ctaLabel}
                  onChange={(v) => {
                    const next = [...config.banners]
                    next[i] = { ...banner, ctaLabel: v }
                    onChange({ ...config, banners: next })
                  }}
                />
                <Field
                  label="CTA route"
                  value={banner.ctaRoute}
                  onChange={(v) => {
                    const next = [...config.banners]
                    next[i] = { ...banner, ctaRoute: v }
                    onChange({ ...config, banners: next })
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
              Performance warning metrics
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Thresholds that trigger operational alerts on merchant dashboards.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                performanceWarnings: [
                  ...config.performanceWarnings,
                  {
                    id: newId('mw'),
                    metric: 'prep_delay',
                    label: 'New warning',
                    threshold: 15,
                    severity: 'warning',
                    message: 'Metric exceeded {threshold} — review operations.',
                    active: true,
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1 rounded-lg bg-[#0C831F] px-3 py-1.5 text-[10px] font-bold text-white"
          >
            <Plus className="h-3 w-3" />
            Add metric
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {config.performanceWarnings.map((w, i) => (
            <div key={w.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <Toggle
                  label="Active"
                  checked={w.active}
                  onChange={(v) => {
                    const next = [...config.performanceWarnings]
                    next[i] = { ...w, active: v }
                    onChange({ ...config, performanceWarnings: next })
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...config,
                      performanceWarnings: config.performanceWarnings.filter((x) => x.id !== w.id),
                    })
                  }
                  className="text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field
                  label="Label"
                  value={w.label}
                  onChange={(v) => {
                    const next = [...config.performanceWarnings]
                    next[i] = { ...w, label: v }
                    onChange({ ...config, performanceWarnings: next })
                  }}
                />
                <label className="block text-xs">
                  <span className="font-semibold text-gray-600">Metric</span>
                  <select
                    value={w.metric}
                    onChange={(e) => {
                      const next = [...config.performanceWarnings]
                      next[i] = {
                        ...w,
                        metric: e.target.value as typeof w.metric,
                      }
                      onChange({ ...config, performanceWarnings: next })
                    }}
                    className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm"
                  >
                    <option value="prep_delay">Prep delay</option>
                    <option value="cancellation_rate">Cancellation rate</option>
                    <option value="rating_drop">Rating drop</option>
                    <option value="stock_out">Stock out</option>
                  </select>
                </label>
                <Field
                  label="Threshold"
                  value={String(w.threshold)}
                  type="number"
                  onChange={(v) => {
                    const next = [...config.performanceWarnings]
                    next[i] = { ...w, threshold: parseFloat(v) || 0 }
                    onChange({ ...config, performanceWarnings: next })
                  }}
                />
                <label className="block text-xs">
                  <span className="font-semibold text-gray-600">Severity</span>
                  <select
                    value={w.severity}
                    onChange={(e) => {
                      const next = [...config.performanceWarnings]
                      next[i] = {
                        ...w,
                        severity: e.target.value as typeof w.severity,
                      }
                      onChange({ ...config, performanceWarnings: next })
                    }}
                    className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
              </div>
              <div className="mt-2">
                <Field
                  label="Alert message (use {threshold})"
                  value={w.message}
                  onChange={(v) => {
                    const next = [...config.performanceWarnings]
                    next[i] = { ...w, message: v }
                    onChange({ ...config, performanceWarnings: next })
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
              Administrative notices
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Broadcast messages to all merchant dashboards.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                notices: [
                  ...config.notices,
                  {
                    id: newId('mn'),
                    title: 'Platform notice',
                    body: '',
                    severity: 'info',
                    active: true,
                    expiresAt: null,
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1 rounded-lg bg-[#FF6B35] px-3 py-1.5 text-[10px] font-bold text-white"
          >
            <Plus className="h-3 w-3" />
            Add notice
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {config.notices.length === 0 ? (
            <p className="rounded-xl border border-dashed py-8 text-center text-xs text-gray-400">
              No active notices — merchants will see a clean dashboard.
            </p>
          ) : (
            config.notices.map((n, i) => (
              <div key={n.id} className="rounded-xl border border-gray-100 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Toggle
                    label="Active"
                    checked={n.active}
                    onChange={(v) => {
                      const next = [...config.notices]
                      next[i] = { ...n, active: v }
                      onChange({ ...config, notices: next })
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...config,
                        notices: config.notices.filter((x) => x.id !== n.id),
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
                    value={n.title}
                    onChange={(v) => {
                      const next = [...config.notices]
                      next[i] = { ...n, title: v }
                      onChange({ ...config, notices: next })
                    }}
                  />
                  <label className="block text-xs">
                    <span className="font-semibold text-gray-600">Body</span>
                    <textarea
                      value={n.body}
                      onChange={(e) => {
                        const next = [...config.notices]
                        next[i] = { ...n, body: e.target.value }
                        onChange({ ...config, notices: next })
                      }}
                      rows={3}
                      className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="font-semibold text-gray-600">Severity</span>
                    <select
                      value={n.severity}
                      onChange={(e) => {
                        const next = [...config.notices]
                        next[i] = {
                          ...n,
                          severity: e.target.value as typeof n.severity,
                        }
                        onChange({ ...config, notices: next })
                      }}
                      className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
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
