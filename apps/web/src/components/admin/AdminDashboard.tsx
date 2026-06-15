'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Store,
  Users,
  Bike,
  ShoppingBag,
  Ticket,
  Megaphone,
  IndianRupee,
  Plus,
  Search,
  Loader2,
  RefreshCw,
  X,
  PackageOpen,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { AdminCatalogCommand } from '@/components/admin/AdminCatalogCommand'
import { AdminStoresOpsPanel } from '@/components/admin/AdminStoresOpsPanel'
import { AdminRidersOpsPanel } from '@/components/admin/AdminRidersOpsPanel'
import { AdminFeatureFlagsPanel } from '@/components/admin/AdminFeatureFlagsPanel'
import { AdminOverviewCommandCenter } from '@/components/admin/AdminOverviewCommandCenter'
import { AdminAdsCommandPanel } from '@/components/admin/AdminAdsCommandPanel'
import { LogoutButton } from '@/components/auth/LogoutButton'
import type { DiscountType, StoreType } from '@rabbit/database'

type TabId = 'overview' | 'stores' | 'customers' | 'riders' | 'orders' | 'coupons' | 'ads' | 'revenue' | 'inventory' | 'settings'

const TABS: { id: TabId; label: string; short: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', short: 'Home', icon: LayoutDashboard },
  { id: 'stores', label: 'Stores', short: 'Stores', icon: Store },
  { id: 'customers', label: 'Customers', short: 'Users', icon: Users },
  { id: 'riders', label: 'Riders', short: 'Riders', icon: Bike },
  { id: 'orders', label: 'Orders', short: 'Orders', icon: ShoppingBag },
  { id: 'inventory', label: 'Global Catalog', short: 'Catalog', icon: PackageOpen },
  { id: 'settings', label: 'Feature Flags', short: 'Flags', icon: Megaphone },
  { id: 'coupons', label: 'Coupons', short: 'Deals', icon: Ticket },
  { id: 'ads', label: 'Ads', short: 'Ads', icon: Megaphone },
  { id: 'revenue', label: 'Revenue', short: 'Rev', icon: IndianRupee },
]

const STORE_TYPES: StoreType[] = ['KIRANA', 'FISH', 'VEGETABLE', 'PHARMACY', 'BAKERY', 'DAIRY', 'MEAT', 'GENERAL']
const ORDER_FILTERS = ['ALL', 'ACTIVE', 'PENDING', 'DELIVERED', 'CANCELLED'] as const
const CHART_COLORS = ['#FF6B35', '#0C831F', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6', '#64748B']

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={cn('mt-1 text-2xl font-black', accent ? 'text-[#0C831F]' : 'text-gray-900')}>{value}</p>
    </div>
  )
}

function BarChart({ data, valueKey, labelKey }: { data: { [k: string]: string | number }[]; valueKey: string; labelKey: string }) {
  const max = Math.max(...data.map((d) => Number(d[valueKey])), 1)
  return (
    <div className="flex h-40 items-end gap-1.5">
      {data.map((d, i) => {
        const v = Number(d[valueKey])
        const h = Math.max(4, (v / max) * 100)
        const lbl = String(d[labelKey])
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] font-bold text-gray-500">{v}</span>
            <div className="w-full rounded-t-md bg-[#FF6B35]/80 transition-all" style={{ height: `${h}%` }} />
            <span className="truncate text-[8px] font-semibold text-gray-400">{lbl.slice(5) || lbl}</span>
          </div>
        )
      })}
    </div>
  )
}

function TypeLegend({ items }: { items: { label: string; count: number }[] }) {
  const total = items.reduce((s, i) => s + i.count, 0) || 1
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-2 text-xs">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
          <span className="flex-1 font-medium text-gray-700">{item.label}</span>
          <span className="font-bold text-gray-900">{item.count}</span>
          <span className="text-gray-400">({Math.round((item.count / total) * 100)}%)</span>
        </div>
      ))}
    </div>
  )
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Loading() {
  return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" /></div>
}

export function AdminDashboard() {
  const [tab, setTab] = useState<TabId>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [metrics, setMetrics] = useState<Record<string, number>>({})
  const [ordersLast7Days, setOrdersLast7Days] = useState<{ date: string; count: number }[]>([])
  const [ordersByStoreType, setOrdersByStoreType] = useState<{ type: string; count: number }[]>([])
  const [recentOrders, setRecentOrders] = useState<Record<string, unknown>[]>([])

  const [shops, setShops] = useState<Record<string, unknown>[]>([])
  const [shopSearch, setShopSearch] = useState('')
  const [shopTypeFilter, setShopTypeFilter] = useState('ALL')
  const [togglingShop, setTogglingShop] = useState<string | null>(null)

  const [customers, setCustomers] = useState<Record<string, unknown>[]>([])
  const [customerSearch, setCustomerSearch] = useState('')

  const [riders, setRiders] = useState<Record<string, unknown>[]>([])
  const [riderModal, setRiderModal] = useState(false)
  const [riderPhone, setRiderPhone] = useState('')
  const [addingRider, setAddingRider] = useState(false)

  const [orders, setOrders] = useState<Record<string, unknown>[]>([])
  const [orderFilter, setOrderFilter] = useState<(typeof ORDER_FILTERS)[number]>('ALL')

  const [coupons, setCoupons] = useState<Record<string, unknown>[]>([])
  const [couponModal, setCouponModal] = useState(false)
  const [couponForm, setCouponForm] = useState({ code: '', discountType: 'FLAT' as DiscountType, discountValue: '', minOrderValue: '0' })
  const [savingCoupon, setSavingCoupon] = useState(false)

  const [revenue, setRevenue] = useState<Record<string, unknown>>({})
  const [revenueRange, setRevenueRange] = useState('week')

  const [platformSettings, setPlatformSettings] = useState({
    globalMinCartValue: 0,
    multiShopRoutingFeePerLeg: 25,
    freeDeliveryThreshold: 499,
  })
  const [savingPlatform, setSavingPlatform] = useState(false)

  const fetchTab = useCallback(async (t: TabId) => {
    const selfContained: TabId[] = ['overview', 'inventory', 'stores', 'riders', 'settings', 'ads']
    if (selfContained.includes(t)) {
      setLoading(false)
      setRefreshing(false)
      return
    }
    setRefreshing(true)
    setError(null)
    try {
      if (t === 'overview') {
        /* AdminOverviewCommandCenter loads its own data */
      } else if (t === 'customers') {
        const res = await fetch('/api/admin/customers')
        const json = await res.json()
        if (!json.success) throw new Error(json.error ?? 'Customers failed')
        setCustomers(json.data ?? [])
      } else if (t === 'orders') {
        const q = orderFilter === 'ALL' ? '' : `?status=${orderFilter}`
        const res = await fetch(`/api/admin/orders${q}`)
        const json = await res.json()
        if (!json.success) throw new Error(json.error ?? 'Orders failed')
        setOrders(json.data ?? [])
      } else if (t === 'coupons') {
        const res = await fetch('/api/admin/coupons')
        const json = await res.json()
        if (!json.success) throw new Error(json.error ?? 'Coupons failed')
        setCoupons(json.data ?? [])
      } else if (t === 'revenue') {
        const res = await fetch(`/api/admin/revenue?range=${revenueRange}`)
        const json = await res.json()
        if (!json.success) throw new Error(json.error ?? 'Revenue failed')
        setRevenue(json.data ?? {})
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [orderFilter, revenueRange])

  useEffect(() => { void fetchTab(tab) }, [tab, fetchTab])

  const filteredShops = useMemo(() => shops.filter((s) => {
    const name = String(s.name ?? '').toLowerCase()
    const matchSearch = !shopSearch || name.includes(shopSearch.toLowerCase())
    const matchType = shopTypeFilter === 'ALL' || s.storeType === shopTypeFilter
    return matchSearch && matchType
  }), [shops, shopSearch, shopTypeFilter])

  const filteredCustomers = useMemo(() => customers.filter((c) => {
    const q = customerSearch.toLowerCase()
    return !q || String(c.name ?? '').toLowerCase().includes(q) || String(c.phone ?? '').includes(q)
  }), [customers, customerSearch])

  const toggleShop = async (id: string, isActive: boolean) => {
    setTogglingShop(id)
    try {
      const res = await fetch(`/api/admin/shops/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      const json = await res.json()
      if (json.success) setShops((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !isActive } : s)))
    } finally { setTogglingShop(null) }
  }

  const addRider = async () => {
    setAddingRider(true)
    try {
      const res = await fetch('/api/admin/riders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: riderPhone }) })
      const json = await res.json()
      if (json.success) { setRiderModal(false); setRiderPhone(''); void fetchTab('riders') }
      else setError(json.error)
    } finally { setAddingRider(false) }
  }

  const createCoupon = async () => {
    setSavingCoupon(true)
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponForm.code,
          discountType: couponForm.discountType,
          discountValue: parseFloat(couponForm.discountValue),
          minOrderValue: parseFloat(couponForm.minOrderValue) || 0,
        }),
      })
      const json = await res.json()
      if (json.success) { setCouponModal(false); setCouponForm({ code: '', discountType: 'FLAT', discountValue: '', minOrderValue: '0' }); void fetchTab('coupons') }
      else setError(json.error)
    } finally { setSavingCoupon(false) }
  }

  const revenueBars = useMemo(() => {
    const d = revenue as { gmv?: number; platformFees?: number; deliveryFees?: number }
    return [
      { label: 'GMV', value: d.gmv ?? 0 },
      { label: 'Platform', value: d.platformFees ?? 0 },
      { label: 'Delivery', value: d.deliveryFees ?? 0 },
    ]
  }, [revenue])

  const renderContent = () => {
    if (loading && tab !== 'overview') return <Loading />

    if (tab === 'overview') return <AdminOverviewCommandCenter />

    if (tab === 'stores') return <AdminStoresOpsPanel />

    if (tab === 'customers') return (
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search name or phone…" className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm" />
        </div>
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
              <tr><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2">Orders</th><th className="px-4 py-2">Spent</th></tr>
            </thead>
            <tbody className="divide-y">
              {filteredCustomers.map((c) => (
                <tr key={String(c.id)}>
                  <td className="px-4 py-3 font-semibold">{String(c.name)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{String(c.phone)}</td>
                  <td className="px-4 py-3">{String(c.totalOrders)}</td>
                  <td className="px-4 py-3 font-bold text-[#0C831F]">{formatCurrency(Number(c.totalSpent ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )

    if (tab === 'riders') return <AdminRidersOpsPanel />

    if (tab === 'orders') return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {ORDER_FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setOrderFilter(f)} className={cn('rounded-full px-3 py-1 text-xs font-bold', orderFilter === f ? 'bg-[#FF6B35] text-white' : 'bg-gray-100 text-gray-600')}>{f}</button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
              <tr><th className="px-4 py-2">Order</th><th className="px-4 py-2">Shop</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Amount</th></tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={String(o.id)}>
                  <td className="px-4 py-3 font-mono text-xs">{String(o.orderNumber)}</td>
                  <td className="px-4 py-3">{String(o.shopName)}</td>
                  <td className="px-4 py-3 text-xs">{String(o.customerName)}<br /><span className="text-gray-400">{String(o.customerPhone)}</span></td>
                  <td className="px-4 py-3"><span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase">{String(o.statusLabel ?? o.status)}</span></td>
                  <td className="px-4 py-3 text-right font-bold text-[#0C831F]">{formatCurrency(Number(o.amount ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )

    if (tab === 'coupons') return (
      <div className="space-y-4">
        <button type="button" onClick={() => setCouponModal(true)} className="flex items-center gap-1 rounded-xl bg-[#FF6B35] px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" />Create Coupon</button>
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
              <tr><th className="px-4 py-2">Code</th><th className="px-4 py-2">Discount</th><th className="px-4 py-2">Uses</th><th className="px-4 py-2">Status</th></tr>
            </thead>
            <tbody className="divide-y">
              {coupons.map((c) => (
                <tr key={String(c.id)}>
                  <td className="px-4 py-3 font-mono font-bold">{String(c.code)}</td>
                  <td className="px-4 py-3">{c.discountType === 'PERCENT' ? `${c.discountValue}%` : formatCurrency(Number(c.discountValue))}</td>
                  <td className="px-4 py-3">{String(c.usedCount)}/{String(c.maxUses)}</td>
                  <td className="px-4 py-3"><span className={cn('rounded px-2 py-0.5 text-[10px] font-bold', c.isActive ? 'bg-green-100 text-[#0C831F]' : 'bg-gray-100')}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )

    if (tab === 'ads') return <AdminAdsCommandPanel />

    if (tab === 'inventory') return <AdminCatalogCommand />

    if (tab === 'settings') return <AdminFeatureFlagsPanel />

    if (tab === 'revenue') return (
      <div className="space-y-6">
        <div className="flex gap-2">
          {['week', 'month'].map((r) => (
            <button key={r} type="button" onClick={() => setRevenueRange(r)} className={cn('rounded-full px-4 py-1.5 text-xs font-bold capitalize', revenueRange === r ? 'bg-[#FF6B35] text-white' : 'bg-gray-100 text-gray-600')}>{r}</button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="GMV" value={formatCurrency(Number((revenue as { gmv?: number }).gmv ?? 0))} accent />
          <StatCard label="Platform Fees" value={formatCurrency(Number((revenue as { platformFees?: number }).platformFees ?? 0))} />
          <StatCard label="Orders" value={String((revenue as { orderCount?: number }).orderCount ?? 0)} />
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-gray-400">Revenue Breakdown</h3>
          <BarChart data={revenueBars.map((b) => ({ label: b.label, value: b.value }))} valueKey="value" labelKey="label" />
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white">
          <h3 className="border-b px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-400">Top Shops</h3>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
              <tr><th className="px-4 py-2">Shop</th><th className="px-4 py-2 text-right">Revenue</th></tr>
            </thead>
            <tbody className="divide-y">
              {((revenue as { topShops?: { shopName: string; revenue: number }[] }).topShops ?? []).map((s, i) => (
                <tr key={i}><td className="px-4 py-3 font-semibold">{s.shopName}</td><td className="px-4 py-3 text-right font-bold text-[#0C831F]">{formatCurrency(s.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )

    return null
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside className="hidden w-56 shrink-0 border-r bg-white lg:block">
        <div className="border-b px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B35] text-sm font-black text-white">R</div>
            <div>
              <p className="text-sm font-black text-gray-900">Rabbit Admin</p>
              <p className="text-[9px] font-bold uppercase text-gray-400">Platform Control</p>
            </div>
          </div>
        </div>
        <nav className="space-y-0.5 p-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => { setLoading(true); setTab(id) }} className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition', tab === id ? 'bg-[#FF6B35]/10 text-[#FF6B35]' : 'text-gray-600 hover:bg-gray-50')}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </nav>
        <div className="border-t p-3">
          <LogoutButton
            compact
            label="Logout"
            className="w-full rounded-xl px-3 py-2 text-xs font-medium hover:bg-red-50"
          />
        </div>
      </aside>

      <div className="flex flex-1 flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-4 py-4 lg:px-8">
          <h1 className="text-lg font-black text-gray-900">{TABS.find((t) => t.id === tab)?.label}</h1>
          <div className="flex items-center gap-2">
            <LogoutButton compact label="Logout" className="hidden sm:inline-flex" />
            <button type="button" onClick={() => void fetchTab(tab)} disabled={refreshing} className="rounded-xl border p-2 text-gray-500 hover:text-[#FF6B35] disabled:opacity-50">
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          {error && <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error} — <Link href="/admin/login" className="font-bold underline">Log in</Link></p>}
          {renderContent()}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex overflow-x-auto border-t bg-white lg:hidden">
        {TABS.map(({ id, short, icon: Icon }) => (
          <button key={id} type="button" onClick={() => { setLoading(true); setTab(id) }} className={cn('flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 py-2 text-[9px] font-bold', tab === id ? 'text-[#FF6B35]' : 'text-gray-400')}>
            <Icon className="h-4 w-4" />{short}
          </button>
        ))}
      </nav>

      <Modal open={riderModal} onClose={() => setRiderModal(false)} title="Add Rider">
        <input value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} placeholder="10-digit phone" className="mb-3 w-full rounded-xl border px-3 py-2 text-sm" />
        <button type="button" disabled={addingRider || riderPhone.length < 10} onClick={() => void addRider()} className="w-full rounded-xl bg-[#0C831F] py-2.5 text-sm font-bold text-white disabled:opacity-50">{addingRider ? 'Adding…' : 'Add Rider'}</button>
      </Modal>

      <Modal open={couponModal} onClose={() => setCouponModal(false)} title="Create Coupon">
        <div className="space-y-3">
          <input value={couponForm.code} onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value }))} placeholder="CODE" className="w-full rounded-xl border px-3 py-2 text-sm uppercase" />
          <select value={couponForm.discountType} onChange={(e) => setCouponForm((f) => ({ ...f, discountType: e.target.value as DiscountType }))} className="w-full rounded-xl border px-3 py-2 text-sm">
            <option value="FLAT">Flat ₹</option>
            <option value="PERCENT">Percent %</option>
          </select>
          <input value={couponForm.discountValue} onChange={(e) => setCouponForm((f) => ({ ...f, discountValue: e.target.value }))} placeholder="Discount value" type="number" className="w-full rounded-xl border px-3 py-2 text-sm" />
          <input value={couponForm.minOrderValue} onChange={(e) => setCouponForm((f) => ({ ...f, minOrderValue: e.target.value }))} placeholder="Min order" type="number" className="w-full rounded-xl border px-3 py-2 text-sm" />
          <button type="button" disabled={savingCoupon || !couponForm.code} onClick={() => void createCoupon()} className="w-full rounded-xl bg-[#FF6B35] py-2.5 text-sm font-bold text-white disabled:opacity-50">{savingCoupon ? 'Saving…' : 'Create'}</button>
        </div>
      </Modal>
    </div>
  )
}
