'use client'

import { FileUploader } from '@/components/ui/file-uploader'
import { CategoryMatrixGrid, Field, Toggle } from '@/components/admin/layout-builder/CategoryMatrix'
import type { HomeFeedConfig } from '@/lib/home-feed-config'
import { STORE_CATEGORY_OPTIONS } from '@/lib/store-category-options'

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

export function CustomerHomeFeedTab({
  config,
  onChange,
  onPersistCategories,
}: {
  config: HomeFeedConfig
  onChange: (next: HomeFeedConfig) => void
  onPersistCategories?: (masterCategories: HomeFeedConfig['masterCategories']) => Promise<void>
}) {
  const toggles = config.componentToggles

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">
          Home screen components
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Toggle which blocks appear on the customer home feed.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle
            label="Category filter bar"
            checked={toggles.categoryBar}
            onChange={(v) =>
              onChange({ ...config, componentToggles: { ...toggles, categoryBar: v } })
            }
          />
          <Toggle
            label="Promo banner"
            checked={toggles.promoBanner}
            onChange={(v) =>
              onChange({ ...config, componentToggles: { ...toggles, promoBanner: v } })
            }
          />
          <Toggle
            label="Flash deals"
            checked={toggles.flashDeals}
            onChange={(v) =>
              onChange({ ...config, componentToggles: { ...toggles, flashDeals: v } })
            }
          />
          <Toggle
            label="Grocery & Kitchen grid"
            checked={toggles.grocerySection}
            onChange={(v) =>
              onChange({ ...config, componentToggles: { ...toggles, grocerySection: v } })
            }
          />
          <Toggle
            label="Snacks & Drinks grid"
            checked={toggles.snacksSection}
            onChange={(v) =>
              onChange({ ...config, componentToggles: { ...toggles, snacksSection: v } })
            }
          />
          <Toggle
            label="Coupon strip"
            checked={toggles.coupons}
            onChange={(v) =>
              onChange({ ...config, componentToggles: { ...toggles, coupons: v } })
            }
          />
        </div>
      </section>

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
                  onChange({ ...config, subPlatformTabs: next })
                }}
              />
              <Field
                label="Route (optional — e.g. /restaurants)"
                value={tab.route ?? ''}
                onChange={(v) => {
                  const next = [...config.subPlatformTabs]
                  next[i] = { ...tab, route: v || null }
                  onChange({ ...config, subPlatformTabs: next })
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">
          Category filter bar
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {config.categoryTabs.map((tab, i) => (
            <div key={tab.id} className="space-y-2 rounded-xl border border-gray-100 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-gray-400">{tab.id}</p>
                <Toggle
                  label=""
                  checked={tab.active !== false}
                  onChange={(v) => {
                    const next = [...config.categoryTabs]
                    next[i] = { ...tab, active: v }
                    onChange({ ...config, categoryTabs: next })
                  }}
                />
              </div>
              <Field
                label="Label"
                value={tab.label}
                onChange={(v) => {
                  const next = [...config.categoryTabs]
                  next[i] = { ...tab, label: v }
                  onChange({ ...config, categoryTabs: next })
                }}
              />
              {tab.id !== 'all' && (
                <label className="block text-xs">
                  <span className="font-semibold text-gray-600">Store type</span>
                  <select
                    value={tab.storeType ?? 'GENERAL'}
                    onChange={(e) => {
                      const next = [...config.categoryTabs]
                      next[i] = { ...tab, storeType: e.target.value }
                      onChange({ ...config, categoryTabs: next })
                    }}
                    className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm"
                  >
                    {STORE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-[#FF6B35]">
          Category matrix & assortment
        </h3>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Field
            label="Grocery section title"
            value={config.groceryKitchen.title}
            onChange={(v) =>
              onChange({
                ...config,
                groceryKitchen: { ...config.groceryKitchen, title: v },
              })
            }
          />
          <Field
            label="Snacks section title"
            value={config.snacksDrinks.title}
            onChange={(v) =>
              onChange({
                ...config,
                snacksDrinks: { ...config.snacksDrinks, title: v },
              })
            }
          />
        </div>
        <CategoryMatrixGrid
          categories={config.masterCategories}
          onChange={(masterCategories) => onChange({ ...config, masterCategories })}
          onPersistCategories={onPersistCategories}
        />
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">Coupons</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {config.coupons.map((c, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-gray-100 p-3">
              <FileUploader
                value={c.image ?? null}
                onChange={(url) => {
                  const next = [...config.coupons]
                  next[i] = { ...c, image: url }
                  onChange({ ...config, coupons: next })
                }}
                label="Coupon creative"
                aspect="banner"
              />
              <Field
                label="Title"
                value={c.title}
                onChange={(v) => {
                  const next = [...config.coupons]
                  next[i] = { ...c, title: v }
                  onChange({ ...config, coupons: next })
                }}
              />
              <Field
                label="Subtitle"
                value={c.sub}
                onChange={(v) => {
                  const next = [...config.coupons]
                  next[i] = { ...c, sub: v }
                  onChange({ ...config, coupons: next })
                }}
              />
              <Field
                label="Cashback line"
                value={c.cashback}
                onChange={(v) => {
                  const next = [...config.coupons]
                  next[i] = { ...c, cashback: v }
                  onChange({ ...config, coupons: next })
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">
          Flash deals & promo banner
        </h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Field
            label="Flash deals title"
            value={config.dealsSection.title}
            onChange={(v) =>
              onChange({ ...config, dealsSection: { ...config.dealsSection, title: v } })
            }
          />
          <Field
            label="Flash deals subtitle"
            value={config.dealsSection.subtitle}
            onChange={(v) =>
              onChange({ ...config, dealsSection: { ...config.dealsSection, subtitle: v } })
            }
          />
          <Field
            label="Fashion deals title"
            value={config.dealsSection.fashionTitle}
            onChange={(v) =>
              onChange({ ...config, dealsSection: { ...config.dealsSection, fashionTitle: v } })
            }
          />
          <Field
            label="Fashion deals subtitle"
            value={config.dealsSection.fashionSubtitle}
            onChange={(v) =>
              onChange({
                ...config,
                dealsSection: { ...config.dealsSection, fashionSubtitle: v },
              })
            }
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-black uppercase text-gray-400">Promo banner</p>
            <FileUploader
              value={config.promoBanner.image ?? null}
              onChange={(url) =>
                onChange({
                  ...config,
                  promoBanner: { ...config.promoBanner, image: url },
                })
              }
              label="Banner background"
              aspect="banner"
            />
            <Field
              label="Badge"
              value={config.promoBanner.badge}
              onChange={(v) =>
                onChange({ ...config, promoBanner: { ...config.promoBanner, badge: v } })
              }
            />
            <Field
              label="Price"
              value={config.promoBanner.price}
              onChange={(v) =>
                onChange({ ...config, promoBanner: { ...config.promoBanner, price: v } })
              }
            />
            <Field
              label="Subtitle"
              value={config.promoBanner.subtitle}
              onChange={(v) =>
                onChange({ ...config, promoBanner: { ...config.promoBanner, subtitle: v } })
              }
            />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-gray-400">Fashion deal badges</p>
            {config.fashionDealBadges.map((badge, i) => (
              <div key={i} className="grid gap-2 rounded-xl border border-gray-100 p-3 sm:grid-cols-2">
                <Field
                  label="Label"
                  value={badge.label}
                  onChange={(v) => {
                    const next = [...config.fashionDealBadges]
                    next[i] = { ...badge, label: v }
                    onChange({ ...config, fashionDealBadges: next })
                  }}
                />
                <Field
                  label="Tag"
                  value={badge.tag}
                  onChange={(v) => {
                    const next = [...config.fashionDealBadges]
                    next[i] = { ...badge, tag: v }
                    onChange({ ...config, fashionDealBadges: next })
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">
          Stores section copy
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field
            label="Section title"
            value={config.storesSection.title}
            onChange={(v) =>
              onChange({ ...config, storesSection: { ...config.storesSection, title: v } })
            }
          />
          <Field
            label="Grocery subtitle"
            value={config.storesSection.subtitleGrocery}
            onChange={(v) =>
              onChange({
                ...config,
                storesSection: { ...config.storesSection, subtitleGrocery: v },
              })
            }
          />
          <Field
            label="Fashion subtitle"
            value={config.storesSection.subtitleFashion}
            onChange={(v) =>
              onChange({
                ...config,
                storesSection: { ...config.storesSection, subtitleFashion: v },
              })
            }
          />
        </div>
        <p className="mt-3 text-[10px] text-gray-400">
          Reference taxonomy: {STORE_CATEGORY_OPTIONS.length} store categories in master catalog.
        </p>
      </section>
    </div>
  )
}
