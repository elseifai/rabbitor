'use client'

import { useCallback, useEffect, useState } from 'react'
import { Briefcase, ChevronRight, Home, Loader2, MapPin, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  addressLabelDisplay,
  formatAddressShort,
  formatCustomerAddress,
  type CustomerAddressRecord,
} from '@/lib/customer-address'
import { authFetch } from '@/lib/session'
import { useLocationStore } from '@/store'
import { AddAddressSheet } from './AddAddressSheet'

function LabelIcon({ label }: { label: CustomerAddressRecord['label'] }) {
  if (label === 'WORK') return <Briefcase className="h-4 w-4" />
  if (label === 'HOME') return <Home className="h-4 w-4" />
  return <MapPin className="h-4 w-4" />
}

export function CheckoutAddressSection({
  selectedId,
  onSelect,
  onAddressResolved,
}: {
  selectedId: string | null
  onSelect: (address: CustomerAddressRecord) => void
  onAddressResolved: (hasAddress: boolean) => void
}) {
  const formattedAddress = useLocationStore((s) => s.formattedAddress)
  const coordinates = useLocationStore((s) => s.coordinates)

  const [addresses, setAddresses] = useState<CustomerAddressRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const selected = addresses.find((a) => a.id === selectedId) ?? addresses[0] ?? null

  const loadAddresses = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await authFetch('/api/user/addresses')
      const json = await res.json()
      if (!json.success) {
        setFetchError(json.error ?? 'Could not load addresses')
        onAddressResolved(false)
        return
      }
      const list = json.data as CustomerAddressRecord[]
      setAddresses(list)
      if (list.length > 0) {
        const pick = list.find((a) => a.isDefault) ?? list[0]
        onSelect(pick)
        onAddressResolved(true)
      } else {
        onAddressResolved(false)
        setShowAddSheet(true)
      }
    } catch {
      setFetchError('Could not load addresses')
      onAddressResolved(false)
    } finally {
      setLoading(false)
    }
  }, [onAddressResolved, onSelect])

  useEffect(() => {
    void loadAddresses()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, [])

  const handleSaved = (addr: CustomerAddressRecord) => {
    setAddresses((prev) => {
      const without = prev.filter((a) => a.id !== addr.id)
      return [addr, ...without.map((a) => ({ ...a, isDefault: false }))]
    })
    onSelect(addr)
    onAddressResolved(true)
    setExpanded(false)
  }

  if (loading) {
    return (
      <div className="flex items-start gap-4 rounded-[2rem] border bg-white p-5 shadow-xs">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#FF6B35]/10 bg-[#FFF8F5] text-[#FF6B35]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">Delivery Address</h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">Loading saved addresses…</p>
        </div>
      </div>
    )
  }

  if (!selected) {
    return (
      <>
        <div className="rounded-[2rem] border-2 border-dashed border-[#FF6B35]/30 bg-white p-5 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF8F5] text-[#FF6B35]">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-slate-900">Add delivery address</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                We need your delivery location to complete checkout. Use auto-detect for fastest setup.
              </p>
              {formattedAddress && coordinates && (
                <p className="mt-2 text-[11px] font-medium text-slate-400">
                  Current app location: {formattedAddress}
                </p>
              )}
              <button
                type="button"
                onClick={() => setShowAddSheet(true)}
                className="mt-3 flex items-center gap-1.5 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-xs font-black uppercase text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Add address
              </button>
            </div>
          </div>
          {fetchError && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{fetchError}</p>
          )}
        </div>
        <AddAddressSheet
          open={showAddSheet}
          onClose={() => setShowAddSheet(false)}
          onSaved={handleSaved}
        />
      </>
    )
  }

  return (
    <>
      <div className="rounded-[2rem] border bg-white shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-start gap-4 p-5 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#FF6B35]/10 bg-[#FFF8F5] text-[#FF6B35]">
            <LabelIcon label={selected.label} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-900">
                Deliver to · {addressLabelDisplay(selected)}
              </h3>
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-[#FF6B35]">
                {expanded ? 'Close' : 'Change'}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
              {formatAddressShort(selected)}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
              {formatCustomerAddress(selected)}
            </p>
          </div>
          <ChevronRight
            className={cn(
              'mt-1 h-4 w-4 shrink-0 text-slate-300 transition',
              expanded && 'rotate-90',
            )}
          />
        </button>

        {expanded && (
          <div className="border-t border-slate-50 px-5 pb-5 pt-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Saved addresses
            </p>
            <div className="space-y-2">
              {addresses.map((addr) => {
                const isSelected = addr.id === selected.id
                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      onSelect(addr)
                      setExpanded(false)
                    }}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition',
                      isSelected
                        ? 'border-[#FF6B35] bg-[#FFF8F5]'
                        : 'border-slate-100 hover:border-slate-200',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        isSelected ? 'bg-[#FF6B35] text-white' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      <LabelIcon label={addr.label} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-black text-slate-900">
                        {addressLabelDisplay(addr)}
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-500">
                        {formatAddressShort(addr)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setExpanded(false)
                setShowAddSheet(true)
              }}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#FF6B35]/40 py-3 text-xs font-black text-[#FF6B35]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add new address
            </button>
          </div>
        )}
      </div>

      <AddAddressSheet
        open={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSaved={handleSaved}
      />
    </>
  )
}

export type { CustomerAddressRecord }
