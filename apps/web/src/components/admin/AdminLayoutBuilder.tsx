'use client'

import { useEffect, useState } from 'react'
import { Bike, LayoutGrid, Loader2, RotateCcw, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DEFAULT_HOME_FEED_CONFIG,
  syncSectionsFromMasterCategories,
  type HomeFeedConfig,
} from '@/lib/home-feed-config'
import {
  DEFAULT_MERCHANT_LAYOUT_CONFIG,
  DEFAULT_RIDER_LAYOUT_CONFIG,
  type MerchantLayoutConfig,
  type RiderLayoutConfig,
} from '@/lib/layout-config'
import { CustomerHomeFeedTab } from '@/components/admin/layout-builder/CustomerHomeFeedTab'
import { MerchantAppTab } from '@/components/admin/layout-builder/MerchantAppTab'
import { RiderGatewayTab } from '@/components/admin/layout-builder/RiderGatewayTab'

type BuilderTab = 'customer' | 'merchant' | 'rider'

const BUILDER_TABS: {
  id: BuilderTab
  label: string
  short: string
  icon: typeof LayoutGrid
}[] = [
  { id: 'customer', label: 'Customer Home Feed', short: 'Customer', icon: LayoutGrid },
  { id: 'merchant', label: 'Merchant App', short: 'Merchant', icon: Store },
  { id: 'rider', label: 'Rider Gateway', short: 'Rider', icon: Bike },
]

export function AdminLayoutBuilder() {
  const [activeTab, setActiveTab] = useState<BuilderTab>('customer')
  const [homeFeed, setHomeFeed] = useState<HomeFeedConfig>(DEFAULT_HOME_FEED_CONFIG)
  const [merchantLayout, setMerchantLayout] = useState<MerchantLayoutConfig>(
    DEFAULT_MERCHANT_LAYOUT_CONFIG,
  )
  const [riderLayout, setRiderLayout] = useState<RiderLayoutConfig>(DEFAULT_RIDER_LAYOUT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([
      fetch('/api/admin/home-feed').then((r) => r.json()),
      fetch('/api/admin/layout-config').then((r) => r.json()),
    ])
      .then(([homeJson, layoutJson]) => {
        if (homeJson.success && homeJson.data) setHomeFeed(homeJson.data)
        if (layoutJson.success && layoutJson.data) {
          setMerchantLayout(layoutJson.data.merchantLayoutConfig)
          setRiderLayout(layoutJson.data.riderLayoutConfig)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const persistHomeFeed = async (config: HomeFeedConfig, toast?: string) => {
    const synced = syncSectionsFromMasterCategories(config.masterCategories, config)
    const res = await fetch('/api/admin/home-feed', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, ...synced }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error ?? 'Home feed save failed')
    setHomeFeed(json.data)
    if (toast) setMessage(toast)
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const synced = syncSectionsFromMasterCategories(homeFeed.masterCategories, homeFeed)
      const homePayload = {
        ...homeFeed,
        ...synced,
      }

      const [homeRes, layoutRes] = await Promise.all([
        fetch('/api/admin/home-feed', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(homePayload),
        }),
        fetch('/api/admin/layout-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantLayoutConfig: merchantLayout,
            riderLayoutConfig: riderLayout,
          }),
        }),
      ])

      const homeJson = await homeRes.json()
      const layoutJson = await layoutRes.json()
      if (!homeJson.success) throw new Error(homeJson.error ?? 'Home feed save failed')
      if (!layoutJson.success) throw new Error(layoutJson.error ?? 'Layout save failed')

      setHomeFeed(homeJson.data)
      setMerchantLayout(layoutJson.data.merchantLayoutConfig)
      setRiderLayout(layoutJson.data.riderLayoutConfig)
      setMessage('Platform layout saved — changes propagate within ~30 seconds')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const resetCurrentTab = () => {
    if (activeTab === 'customer') setHomeFeed(DEFAULT_HOME_FEED_CONFIG)
    if (activeTab === 'merchant') setMerchantLayout(DEFAULT_MERCHANT_LAYOUT_CONFIG)
    if (activeTab === 'rider') setRiderLayout(DEFAULT_RIDER_LAYOUT_CONFIG)
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
      <div className="rounded-2xl border bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6B35]">
              No-Code Platform Control Suite
            </p>
            <h2 className="mt-1 text-lg font-black text-gray-900">Unified Layout Builder</h2>
            <p className="mt-1 max-w-xl text-sm text-gray-500">
              Configure customer home feeds, merchant dashboards, and rider gateway experiences —
              all with native file uploads and live category matrix management.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetCurrentTab}
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold text-gray-600"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset tab defaults
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-xl bg-[#FF6B35] px-5 py-2 text-xs font-black text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save all layouts'}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {BUILDER_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition',
                activeTab === id
                  ? 'bg-[#FF6B35] text-white shadow-md'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-[#FF6B35]/30',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p className="rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm text-gray-700">
          {message}
        </p>
      )}

      {activeTab === 'customer' && (
        <CustomerHomeFeedTab
          config={homeFeed}
          onChange={setHomeFeed}
          onPersistCategories={async (masterCategories) => {
            try {
              await persistHomeFeed({ ...homeFeed, masterCategories }, 'Category image saved to home feed')
            } catch (e) {
              setMessage(e instanceof Error ? e.message : 'Could not save category image')
            }
          }}
        />
      )}
      {activeTab === 'merchant' && (
        <MerchantAppTab config={merchantLayout} onChange={setMerchantLayout} />
      )}
      {activeTab === 'rider' && (
        <RiderGatewayTab config={riderLayout} onChange={setRiderLayout} />
      )}

      <div className="flex justify-end pb-8">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-xl bg-[#FF6B35] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save all layouts'}
        </button>
      </div>
    </div>
  )
}
