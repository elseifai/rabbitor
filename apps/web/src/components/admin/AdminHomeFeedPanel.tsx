'use client'

import { useEffect, useState } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import {
  DEFAULT_HOME_FEED_CONFIG,
  type HomeFeedCategoryItem,
  type HomeFeedCategorySection,
  type HomeFeedConfig,
} from '@/lib/home-feed-config'

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block text-xs">
      <span className="font-semibold text-gray-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm"
      />
    </label>
  )
}

function CategoryItemEditor({
  item,
  onChange,
}: {
  item: HomeFeedCategoryItem
  onChange: (next: HomeFeedCategoryItem) => void
}) {
  return (
    <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
      <Field label="Label" value={item.label} onChange={(v) => onChange({ ...item, label: v })} />
      <Field
        label="Image URL"
        value={item.image}
        onChange={(v) => onChange({ ...item, image: v })}
        placeholder="https://..."
      />
      <Field
        label="Category link"
        value={item.category}
        onChange={(v) => onChange({ ...item, category: v })}
        placeholder="kirana, dairy, fish…"
      />
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image} alt="" className="h-16 w-full rounded-lg object-cover" />
      ) : null}
    </div>
  )
}

function CategorySectionEditor({
  section,
  onChange,
}: {
  section: HomeFeedCategorySection
  onChange: (next: HomeFeedCategorySection) => void
}) {
  const updateRow = (row: 'row1' | 'row2' | 'row3', index: number, item: HomeFeedCategoryItem) => {
    const next = [...section[row]]
    next[index] = item
    onChange({ ...section, [row]: next })
  }

  return (
    <div className="space-y-4">
      <Field
        label="Section title"
        value={section.title}
        onChange={(v) => onChange({ ...section, title: v })}
      />
      {(['row1', 'row2', 'row3'] as const).map((row) => (
        <div key={row}>
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
            {row}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {section[row].map((item, i) => (
              <CategoryItemEditor
                key={`${row}-${i}`}
                item={item}
                onChange={(next) => updateRow(row, i, next)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function AdminHomeFeedPanel() {
  const [config, setConfig] = useState<HomeFeedConfig>(DEFAULT_HOME_FEED_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void fetch('/api/admin/home-feed')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setConfig(json.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/home-feed', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Save failed')
      setConfig(json.data)
      setMessage('Home feed updated — customers will see changes within ~30 seconds')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Customize customer home tabs, category grids, coupons, section titles, and images.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfig(DEFAULT_HOME_FEED_CONFIG)}
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold text-gray-600"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset defaults
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-xl bg-[#FF6B35] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save home feed'}
          </button>
        </div>
      </div>

      {message && (
        <p className="rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm text-gray-700">
          {message}
        </p>
      )}

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">
          Sub-platform tabs
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {config.subPlatformTabs.map((tab, i) => (
            <div key={tab.id} className="space-y-2 rounded-xl border border-gray-100 p-3">
              <p className="text-[10px] font-bold uppercase text-gray-400">{tab.id}</p>
              <Field
                label="Label"
                value={tab.label}
                onChange={(v) => {
                  const next = [...config.subPlatformTabs]
                  next[i] = { ...tab, label: v }
                  setConfig({ ...config, subPlatformTabs: next })
                }}
              />
              <Field
                label="Route (optional — e.g. /restaurants)"
                value={tab.route ?? ''}
                onChange={(v) => {
                  const next = [...config.subPlatformTabs]
                  next[i] = { ...tab, route: v || null }
                  setConfig({ ...config, subPlatformTabs: next })
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">
          Category tabs (home filter bar)
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {config.categoryTabs.map((tab, i) => (
            <div key={tab.id} className="space-y-2 rounded-xl border border-gray-100 p-3">
              <p className="text-[10px] font-bold uppercase text-gray-400">{tab.id}</p>
              <Field
                label="Label"
                value={tab.label}
                onChange={(v) => {
                  const next = [...config.categoryTabs]
                  next[i] = { ...tab, label: v }
                  setConfig({ ...config, categoryTabs: next })
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-[#FF6B35]">
          Grocery & Kitchen grid
        </h3>
        <CategorySectionEditor
          section={config.groceryKitchen}
          onChange={(groceryKitchen) => setConfig({ ...config, groceryKitchen })}
        />
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-[#FF6B35]">
          Snacks & Drinks grid
        </h3>
        <CategorySectionEditor
          section={config.snacksDrinks}
          onChange={(snacksDrinks) => setConfig({ ...config, snacksDrinks })}
        />
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">Coupons</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {config.coupons.map((c, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-gray-100 p-3">
              <Field
                label="Title"
                value={c.title}
                onChange={(v) => {
                  const next = [...config.coupons]
                  next[i] = { ...c, title: v }
                  setConfig({ ...config, coupons: next })
                }}
              />
              <Field
                label="Subtitle"
                value={c.sub}
                onChange={(v) => {
                  const next = [...config.coupons]
                  next[i] = { ...c, sub: v }
                  setConfig({ ...config, coupons: next })
                }}
              />
              <Field
                label="Cashback line"
                value={c.cashback}
                onChange={(v) => {
                  const next = [...config.coupons]
                  next[i] = { ...c, cashback: v }
                  setConfig({ ...config, coupons: next })
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">
          Section copy & promo banner
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field
            label="Flash deals title"
            value={config.dealsSection.title}
            onChange={(v) =>
              setConfig({ ...config, dealsSection: { ...config.dealsSection, title: v } })
            }
          />
          <Field
            label="Flash deals subtitle"
            value={config.dealsSection.subtitle}
            onChange={(v) =>
              setConfig({ ...config, dealsSection: { ...config.dealsSection, subtitle: v } })
            }
          />
          <Field
            label="Fashion deals title"
            value={config.dealsSection.fashionTitle}
            onChange={(v) =>
              setConfig({ ...config, dealsSection: { ...config.dealsSection, fashionTitle: v } })
            }
          />
          <Field
            label="Fashion deals subtitle"
            value={config.dealsSection.fashionSubtitle}
            onChange={(v) =>
              setConfig({
                ...config,
                dealsSection: { ...config.dealsSection, fashionSubtitle: v },
              })
            }
          />
          <Field
            label="Stores section title"
            value={config.storesSection.title}
            onChange={(v) =>
              setConfig({ ...config, storesSection: { ...config.storesSection, title: v } })
            }
          />
          <Field
            label="Stores subtitle (grocery)"
            value={config.storesSection.subtitleGrocery}
            onChange={(v) =>
              setConfig({
                ...config,
                storesSection: { ...config.storesSection, subtitleGrocery: v },
              })
            }
          />
          <Field
            label="Promo badge"
            value={config.promoBanner.badge}
            onChange={(v) =>
              setConfig({ ...config, promoBanner: { ...config.promoBanner, badge: v } })
            }
          />
          <Field
            label="Promo price"
            value={config.promoBanner.price}
            onChange={(v) =>
              setConfig({ ...config, promoBanner: { ...config.promoBanner, price: v } })
            }
          />
          <Field
            label="Promo subtitle"
            value={config.promoBanner.subtitle}
            onChange={(v) =>
              setConfig({ ...config, promoBanner: { ...config.promoBanner, subtitle: v } })
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">
          Fashion deal badges
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {config.fashionDealBadges.map((badge, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-gray-100 p-3 sm:grid-cols-2">
              <Field
                label="Label"
                value={badge.label}
                onChange={(v) => {
                  const next = [...config.fashionDealBadges]
                  next[i] = { ...badge, label: v }
                  setConfig({ ...config, fashionDealBadges: next })
                }}
              />
              <Field
                label="Tag"
                value={badge.tag}
                onChange={(v) => {
                  const next = [...config.fashionDealBadges]
                  next[i] = { ...badge, tag: v }
                  setConfig({ ...config, fashionDealBadges: next })
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end pb-8">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-xl bg-[#FF6B35] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save home feed'}
        </button>
      </div>
    </div>
  )
}
