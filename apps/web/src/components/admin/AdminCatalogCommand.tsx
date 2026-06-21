'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Edit3,
  Eye,
  ImageIcon,
  Loader2,
  Package,
  Plus,
  Search,
  Sparkles,
  Store,
  Trash2,
  TrendingUp,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import {
  itemTypeBadgeClass,
  itemTypeLabel,
  velocityBadgeClass,
  type CatalogVelocityBadge,
} from '@/lib/catalog-performance'
import type { CatalogItemType } from '@rabbit/database'
import { MasterCatalogControlModal } from '@/components/admin/MasterCatalogControlModal'

type CatalogItem = {
  id: string
  sku: string | null
  name: string
  description: string | null
  itemType: CatalogItemType
  category: string
  subcategory: string | null
  basePrice: number
  imageUrl: string | null
  storeType: string
  lifetimeOrdersCount: number
  lifetimeRevenue: number
  customerFeedbackPositivePercent: number
  velocityRank: number
  velocityBadge: CatalogVelocityBadge
  velocityLabel: string
}

type Shop = { id: string; name: string }

type UploadResult = {
  upserted: number
  skipped: number
  lineErrors: string[]
}

type SeedResult = {
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
  bySector: Record<string, number>
  entries: Array<{ name: string; sku: string; action: 'created' | 'updated' | 'skipped' }>
}

type CatalogStats = {
  totalItems: number
  shopMappings: number
  categoryBreakdown: Array<{ category: string; count: number }>
  storeTypeBreakdown: Array<{ storeType: string; count: number }>
}

type StreamProgress = {
  chunk: number
  totalChunks: number
  processed: number
  total: number
  created: number
  updated: number
  skipped: number
  sector: string
}

const SECTOR_COLORS: Record<string, string> = {
  kirana: 'bg-amber-100 text-amber-800 ring-amber-200',
  dairy: 'bg-sky-100 text-sky-800 ring-sky-200',
  bakery: 'bg-rose-100 text-rose-800 ring-rose-200',
  veggies: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  fish: 'bg-blue-100 text-blue-800 ring-blue-200',
}

export function AdminCatalogCommand() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [stats, setStats] = useState<CatalogStats | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)

  // Standard seed (66 items)
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null)

  // Mass seed (500+ items) with SSE streaming
  const [massSeeding, setMassSeeding] = useState(false)
  const [streamProgress, setStreamProgress] = useState<StreamProgress | null>(null)
  const [massSeedResult, setMassSeedResult] = useState<SeedResult | null>(null)
  const [streamLog, setStreamLog] = useState<string[]>([])

  const [error, setError] = useState<string | null>(null)
  const [controlItem, setControlItem] = useState<CatalogItem | null>(null)
  const [controlTab, setControlTab] = useState<'profile' | 'assortment' | 'feedback'>('profile')
  const [bindItem, setBindItem] = useState<CatalogItem | null>(null)
  const [bindForm, setBindForm] = useState({
    shopId: '',
    storePrice: '',
    stock: '10',
    maxPurchaseQty: '5',
    binLocation: '',
  })
  const [binding, setBinding] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  // ── Image Audit Mode state (handlers declared after `load` below) ──────────
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [auditMode, setAuditMode] = useState(false)
  const [swapItem, setSwapItem] = useState<CatalogItem | null>(null)
  const [swapUrlInput, setSwapUrlInput] = useState('')
  const [swapLoading, setSwapLoading] = useState(false)
  const [swapError, setSwapError] = useState<string | null>(null)
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [catRes, shopRes, statsRes] = await Promise.all([
        fetch(`/api/admin/catalog?q=${encodeURIComponent(query)}`),
        fetch('/api/admin/shops'),
        fetch('/api/admin/catalog/stats'),
      ])
      const catJson = await catRes.json()
      const shopJson = await shopRes.json()
      const statsJson = await statsRes.json()
      if (catJson.success) setItems(catJson.data ?? [])
      if (shopJson.success) setShops(shopJson.data ?? [])
      if (statsJson.success) setStats(statsJson.data ?? null)
    } catch {
      setError('Failed to load catalog')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  const handleImageSwap = useCallback(
    async (itemId: string, file?: File, url?: string) => {
      setSwapLoading(true)
      setSwapError(null)
      setSwapSuccess(null)
      try {
        let res: Response
        if (file) {
          const form = new FormData()
          form.append('file', file)
          res = await fetch(`/api/admin/catalog/${itemId}/image`, { method: 'POST', body: form })
        } else if (url) {
          res = await fetch(`/api/admin/catalog/${itemId}/image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: url }),
          })
        } else {
          throw new Error('Provide a file or URL')
        }
        const json = await res.json()
        if (!json.success) throw new Error(json.error ?? 'Swap failed')
        setSwapSuccess(`Image updated · propagated to ${json.data.propagatedToProducts} store products`)
        setSwapItem(null)
        setSwapUrlInput('')
        void load()
      } catch (e) {
        setSwapError(e instanceof Error ? e.message : 'Swap failed')
      } finally {
        setSwapLoading(false)
      }
    },
    [load],
  )

  // Scroll log to bottom when new entries arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [streamLog])

  const summary = useMemo(
    () => ({
      total: items.length,
      highVelocity: items.filter((i) => i.velocityBadge === 'high').length,
      avgFeedback:
        items.length > 0
          ? Math.round(
              items.reduce((s, i) => s + i.customerFeedbackPositivePercent, 0) / items.length,
            )
          : 0,
    }),
    [items],
  )

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return
      setUploading(true)
      setUploadProgress(15)
      setUploadResult(null)
      setError(null)
      try {
        const form = new FormData()
        form.append('file', file)
        setUploadProgress(45)
        const res = await fetch('/api/admin/catalog/bulk-upload', { method: 'POST', body: form })
        setUploadProgress(85)
        const json = await res.json()
        if (!json.success) throw new Error(json.error ?? 'Upload failed')
        setUploadProgress(100)
        setUploadResult({
          upserted: json.upserted ?? 0,
          skipped: json.skipped ?? 0,
          lineErrors: json.lineErrors ?? json.errors ?? [],
        })
        void load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [load],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (f) => void onDrop(f),
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: uploading,
  })

  const runSystemSeed = async () => {
    setSeeding(true)
    setSeedResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/catalog/seed', { method: 'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Seed failed')
      setSeedResult(json.data as SeedResult)
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seed failed')
    } finally {
      setSeeding(false)
    }
  }

  const runMassSeed = async () => {
    setMassSeeding(true)
    setMassSeedResult(null)
    setStreamProgress(null)
    setStreamLog([])
    setError(null)

    try {
      const res = await fetch('/api/admin/catalog/mass-seed', { method: 'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Mass seed failed')
      const result = json.data as SeedResult
      setMassSeedResult(result)
      setStreamLog((prev) => [
        ...prev,
        `✓ Complete — ${result.created} created · ${result.updated} updated · ${result.skipped} skipped`,
      ])
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mass seed failed')
    } finally {
      setMassSeeding(false)
    }
  }

  const openControl = (item: CatalogItem, tab: 'profile' | 'assortment' | 'feedback' = 'profile') => {
    setControlTab(tab)
    setControlItem(item)
  }

  const handleDelete = async (item: CatalogItem) => {
    if (!confirm(`Remove "${item.name}" from the Global Catalog? This cannot be undone.`)) return
    setDeletingId(item.id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/catalog/${item.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Delete failed')
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const bindToShop = async () => {
    if (!bindItem || !bindForm.shopId) return
    setBinding(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/catalog/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogItemId: bindItem.id,
          shopId: bindForm.shopId,
          storePrice: bindForm.storePrice ? Number(bindForm.storePrice) : undefined,
          stock: Number(bindForm.stock),
          maxPurchaseQty: Number(bindForm.maxPurchaseQty),
          binLocation: bindForm.binLocation,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Bind failed')
      setBindItem(null)
      setBindForm({ shopId: '', storePrice: '', stock: '10', maxPurchaseQty: '5', binLocation: '' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bind failed')
    } finally {
      setBinding(false)
    }
  }

  const progressPct = streamProgress
    ? Math.round((streamProgress.processed / streamProgress.total) * 100)
    : 0

  return (
    <div className="space-y-5">

      {/* ── DIAGNOSTIC DASHBOARD ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-orange-100 p-2">
              <Package className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Templates</p>
          </div>
          <p className="mt-2 text-3xl font-black text-gray-900">
            {loading ? '—' : (stats?.totalItems ?? summary.total).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-100 p-2">
              <Store className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Shop Mappings</p>
          </div>
          <p className="mt-2 text-3xl font-black text-gray-900">
            {loading ? '—' : (stats?.shopMappings ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-yellow-100 p-2">
              <TrendingUp className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">High Velocity</p>
          </div>
          <p className="mt-2 text-3xl font-black text-yellow-600">{summary.highVelocity}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-100 p-2">
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Satisfaction</p>
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-600">{summary.avgFeedback}%</p>
        </div>
      </div>

      {/* ── CATEGORY VOLUME DISTRIBUTION ── */}
      {stats && stats.categoryBreakdown.length > 0 && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-orange-500" />
            <p className="text-xs font-black uppercase tracking-widest text-gray-500">Category Volume Distribution</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.categoryBreakdown.slice(0, 12).map((c) => (
              <span
                key={c.category}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold capitalize text-slate-700 ring-1 ring-slate-200"
              >
                <span className="text-orange-500">{c.count}</span>
                {c.category}
              </span>
            ))}
          </div>
          {stats.storeTypeBreakdown.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {stats.storeTypeBreakdown.map((s) => (
                <span
                  key={s.storeType}
                  className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold capitalize text-orange-700 ring-1 ring-orange-100"
                >
                  {s.storeType.toLowerCase()}: {s.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INGESTION ENGINE CONTROL PANEL ── */}
      <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/80 to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-orange-600">
              Bulk Import & Ingestion Engine
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              CSV: sku, name, category, subcategory, base_price, description, type · or run seeding engines below
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Standard 66-item seed */}
            <button
              type="button"
              disabled={seeding || massSeeding || uploading}
              onClick={() => void runSystemSeed()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-orange-400" />}
              Run 66-Item Seed
            </button>

            {/* Hyper-scale 500+ mass seed */}
            <button
              type="button"
              disabled={seeding || massSeeding || uploading}
              onClick={() => void runMassSeed()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {massSeeding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 text-yellow-400" />
              )}
              Run Hyper-Scale 500+ Seed Engine
            </button>
          </div>
        </div>

        {/* CSV Drop zone */}
        <div
          {...getRootProps()}
          className={cn(
            'mt-4 cursor-pointer rounded-2xl border-2 border-dashed px-6 py-8 text-center transition',
            isDragActive
              ? 'border-orange-400 bg-orange-100/50'
              : 'border-orange-200 bg-white/60 hover:border-orange-300',
            uploading && 'pointer-events-none opacity-60',
          )}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
          ) : (
            <UploadCloud className="mx-auto h-8 w-8 text-orange-500" />
          )}
          <p className="mt-2 text-sm font-bold text-gray-800">
            {uploading ? 'Uploading & validating rows…' : 'Bulk Import Master Catalog (.csv)'}
          </p>
          <p className="mt-1 text-xs text-gray-500">Drop file here or click to browse</p>
        </div>

        {(uploading || uploadProgress > 0) && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-orange-500 transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {uploadResult && (
          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
            <p className="font-bold text-emerald-800">
              ✓ Upserted {uploadResult.upserted} items · skipped {uploadResult.skipped} rows
            </p>
            {uploadResult.lineErrors.length > 0 && (
              <ul className="mt-2 max-h-24 overflow-y-auto text-xs text-red-600">
                {uploadResult.lineErrors.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* Standard seed result */}
        {seedResult && <SeedResultPanel result={seedResult} title="66-Item Seed Summary" />}

        {/* Mass seed: live streaming progress bar */}
        {massSeeding && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Ingestion Engine — Live Stream
              </p>
              {streamProgress && (
                <span className="text-xs font-bold text-orange-600">
                  Chunk {streamProgress.chunk}/{streamProgress.totalChunks} ·{' '}
                  {streamProgress.processed}/{streamProgress.total}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-gray-400">{progressPct}% complete</p>

            {/* Real-time sector counters */}
            {streamProgress && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-emerald-50 py-2">
                  <p className="text-lg font-black text-emerald-700">{streamProgress.created}</p>
                  <p className="text-[10px] font-bold uppercase text-emerald-600">Created</p>
                </div>
                <div className="rounded-lg bg-blue-50 py-2">
                  <p className="text-lg font-black text-blue-700">{streamProgress.updated}</p>
                  <p className="text-[10px] font-bold uppercase text-blue-600">Updated</p>
                </div>
                <div className="rounded-lg bg-amber-50 py-2">
                  <p className="text-lg font-black text-amber-700">{streamProgress.skipped}</p>
                  <p className="text-[10px] font-bold uppercase text-amber-600">Skipped</p>
                </div>
              </div>
            )}

            {/* Live log scroll */}
            {streamLog.length > 0 && (
              <div
                ref={logRef}
                className="mt-3 max-h-32 overflow-y-auto rounded-xl bg-slate-900 p-3 font-mono text-[10px] text-slate-300"
              >
                {streamLog.map((line, i) => (
                  <p key={i} className="leading-relaxed">{line}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mass seed final result */}
        {massSeedResult && !massSeeding && (
          <SeedResultPanel result={massSeedResult} title="Hyper-Scale Ingestion Summary" />
        )}
      </div>

      {/* ── SEARCH + MODE TOGGLE ── */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border bg-white p-3">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKU, name, category…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => { setAuditMode((v) => !v); setSwapSuccess(null) }}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition',
            auditMode
              ? 'border-violet-300 bg-violet-600 text-white shadow-md'
              : 'border-gray-200 bg-white text-gray-700 hover:border-violet-300 hover:text-violet-700',
          )}
        >
          {auditMode ? <Eye className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
          {auditMode ? 'Exit Audit' : 'Image Audit'}
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {swapSuccess && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {swapSuccess}
        </p>
      )}

      {/* ── IMAGE AUDIT GRID ── */}
      {auditMode && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-black text-gray-900">Image Audit Mode</h3>
              <p className="text-xs text-gray-500">
                {items.filter((i) => !i.imageUrl).length} missing · {items.filter((i) => i.imageUrl).length} have images
              </p>
            </div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-200">
              {items.length} items
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'group relative overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md',
                  !item.imageUrl && 'border-red-200 ring-1 ring-red-200',
                )}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement
                        el.style.display = 'none'
                        el.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={cn('flex h-full w-full flex-col items-center justify-center gap-1', item.imageUrl && 'hidden')}>
                    <Package className="h-8 w-8 text-red-300" />
                    <p className="text-[9px] font-bold text-red-400">NO IMAGE</p>
                  </div>
                  {/* Swap overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => { setSwapItem(item); setSwapUrlInput(''); setSwapError(null); setSwapSuccess(null) }}
                      className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-900 shadow-lg hover:bg-violet-50"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Swap Image
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="truncate text-[10px] font-bold leading-tight text-gray-800">{item.name}</p>
                  <p className="mt-0.5 truncate text-[9px] capitalize text-gray-400">{item.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CATALOG TABLE ── */}
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-white">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category / Type</th>
              <th className="px-4 py-3">Net price</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">Satisfaction</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No templates — run a seed engine or bulk import a CSV
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-orange-50/20">
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex max-w-[140px] rounded-full px-2 py-1 text-[9px] font-black leading-tight ring-1',
                        velocityBadgeClass(item.velocityBadge),
                      )}
                    >
                      {item.velocityLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                          <Package className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={() => openControl(item)}
                          className="text-left font-bold text-gray-900 underline-offset-2 hover:text-[#FF6B35] hover:underline"
                        >
                          {item.name}
                        </button>
                        <p className="font-mono text-[10px] text-gray-400">{item.sku ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold capitalize">{item.category}</p>
                    {item.subcategory && (
                      <p className="text-[10px] text-gray-400">{item.subcategory}</p>
                    )}
                    <span
                      className={cn(
                        'mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black ring-1',
                        itemTypeBadgeClass(item.itemType),
                      )}
                    >
                      {itemTypeLabel(item.itemType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#0C831F]">
                    {formatCurrency(item.basePrice)}
                  </td>
                  <td className="px-4 py-3 font-bold">{item.lifetimeOrdersCount}</td>
                  <td className="px-4 py-3 font-bold">{formatCurrency(item.lifetimeRevenue)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">
                      ⭐ {item.customerFeedbackPositivePercent}% Positive
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        title="Quick edit"
                        onClick={() => openControl(item, 'profile')}
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:border-orange-300 hover:text-orange-600"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        title="Bind to shop"
                        onClick={() => {
                          setBindItem(item)
                          setBindForm((f) => ({ ...f, storePrice: String(item.basePrice) }))
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Remove from catalog"
                        disabled={deletingId === item.id}
                        onClick={() => void handleDelete(item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-400 transition hover:border-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      >
                        {deletingId === item.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MasterCatalogControlModal
        itemId={controlItem?.id ?? null}
        itemName={controlItem?.name ?? ''}
        open={!!controlItem}
        initialTab={controlTab}
        onClose={() => setControlItem(null)}
        onSaved={() => void load()}
      />

      {/* ── SWAP IMAGE MODAL ── */}
      {swapItem && (
        <SwapImageModal
          item={swapItem}
          urlInput={swapUrlInput}
          onUrlChange={setSwapUrlInput}
          loading={swapLoading}
          error={swapError}
          onClose={() => { setSwapItem(null); setSwapError(null) }}
          onSwapFile={(file) => void handleImageSwap(swapItem.id, file)}
          onSwapUrl={() => void handleImageSwap(swapItem.id, undefined, swapUrlInput)}
        />
      )}

      {bindItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-bold">Bind to shop</h3>
            <p className="text-sm text-gray-500">{bindItem.name}</p>
            <div className="mt-4 space-y-3">
              <select
                value={bindForm.shopId}
                onChange={(e) => setBindForm((f) => ({ ...f, shopId: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              >
                <option value="">Select shop…</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                placeholder="Store price"
                value={bindForm.storePrice}
                onChange={(e) => setBindForm((f) => ({ ...f, storePrice: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
              <input
                placeholder="Bin location"
                value={bindForm.binLocation}
                onChange={(e) => setBindForm((f) => ({ ...f, binLocation: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setBindItem(null)}
                className="flex-1 rounded-xl border py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={binding}
                onClick={() => void bindToShop()}
                className="flex-1 rounded-xl bg-orange-500 py-2 text-sm font-bold text-white"
              >
                Deploy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SHARED SEED RESULT PANEL ──
function SeedResultPanel({ result, title }: { result: SeedResult; title: string }) {
  const SECTOR_COLORS: Record<string, string> = {
    kirana: 'bg-amber-50 text-amber-700 ring-amber-100',
    dairy: 'bg-sky-50 text-sky-700 ring-sky-100',
    bakery: 'bg-rose-50 text-rose-700 ring-rose-100',
    veggies: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    fish: 'bg-blue-50 text-blue-700 ring-blue-100',
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm shadow-sm">
      <div className="border-b bg-slate-900 px-4 py-2.5 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-orange-400">{title}</p>
        <span className="text-xs font-bold text-slate-400">{result.total} rows processed</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-4">
        <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center">
          <p className="text-3xl font-black text-emerald-700">{result.created}</p>
          <p className="text-[10px] font-bold uppercase text-emerald-600">Created</p>
        </div>
        <div className="rounded-xl bg-blue-50 px-3 py-3 text-center">
          <p className="text-3xl font-black text-blue-700">{result.updated}</p>
          <p className="text-[10px] font-bold uppercase text-blue-600">Updated</p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-3 text-center">
          <p className="text-3xl font-black text-amber-700">{result.skipped}</p>
          <p className="text-[10px] font-bold uppercase text-amber-600">Skipped</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
          <p className="text-3xl font-black text-slate-800">{result.total}</p>
          <p className="text-[10px] font-bold uppercase text-slate-500">Total</p>
        </div>
      </div>
      {Object.keys(result.bySector).length > 0 && (
        <div className="border-t px-4 py-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">By Sector</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.bySector).map(([sector, count]) => (
              <span
                key={sector}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-bold capitalize ring-1',
                  SECTOR_COLORS[sector] ?? 'bg-orange-50 text-orange-700 ring-orange-100',
                )}
              >
                {sector}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
      {result.errors.length > 0 && (
        <ul className="max-h-24 overflow-y-auto border-t px-4 py-2 text-xs text-red-600">
          {result.errors.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      )}
    </div>
  )
}

// ── SWAP IMAGE MODAL ──────────────────────────────────────────────────────────
function SwapImageModal({
  item,
  urlInput,
  onUrlChange,
  loading,
  error,
  onClose,
  onSwapFile,
  onSwapUrl,
}: {
  item: { id: string; name: string; imageUrl: string | null }
  urlInput: string
  onUrlChange: (v: string) => void
  loading: boolean
  error: string | null
  onClose: () => void
  onSwapFile: (file: File) => void
  onSwapUrl: () => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
    maxFiles: 1,
    maxSize: 2_000_000,
    disabled: loading,
    onDrop: (files) => {
      const f = files[0]
      if (!f) return
      setPendingFile(f)
      setPreview(URL.createObjectURL(f))
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="font-black text-gray-900">Swap Product Image</h3>
            <p className="max-w-[280px] truncate text-xs text-gray-500">{item.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Current vs new preview */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">Current</p>
              <div className="aspect-square overflow-hidden rounded-xl border bg-gray-50">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-10 w-10 text-gray-300" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">New Preview</p>
              <div className="aspect-square overflow-hidden rounded-xl border bg-gray-50">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : urlInput.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlInput} alt="" className="h-full w-full object-cover" onError={() => {}} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1">
                    <ImageIcon className="h-8 w-8 text-gray-200" />
                    <p className="text-[9px] text-gray-300">Drop or paste URL</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Drag-drop zone */}
          <div
            {...getRootProps()}
            className={cn(
              'cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition',
              isDragActive
                ? 'border-violet-400 bg-violet-50'
                : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/40',
            )}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto mb-1.5 h-6 w-6 text-gray-400" />
            <p className="text-sm font-semibold text-gray-600">
              {isDragActive ? 'Drop image here' : 'Drag & drop an image'}
            </p>
            <p className="text-xs text-gray-400">JPG, PNG, WebP — max 2 MB</p>
          </div>

          {pendingFile && (
            <button
              type="button"
              disabled={loading}
              onClick={() => onSwapFile(pendingFile)}
              className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-black text-white disabled:opacity-60"
            >
              {loading ? 'Uploading…' : `Upload "${pendingFile.name}"`}
            </button>
          )}

          {/* — OR — URL input */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-bold text-gray-400">OR paste URL</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="flex gap-2">
            <input
              value={urlInput}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://images.unsplash.com/…"
              className="flex-1 rounded-xl border px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            />
            <button
              type="button"
              disabled={loading || !urlInput.startsWith('http')}
              onClick={onSwapUrl}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
            </button>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
