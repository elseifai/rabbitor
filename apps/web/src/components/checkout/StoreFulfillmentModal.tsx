'use client'

/**
 * StoreFulfillmentModal
 *
 * Appears as a bottom sheet directly above the payment processing sheet
 * when the nearest dark store cannot fully fulfill the cart.
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │  Choose Your Fulfillment Store      │  ← header
 *   │  N items in your cart               │
 *   │─────────────────────────────────────│
 *   │  [Store A Card]  Express Delivery   │  ← partial or nearest FULL
 *   │  8/10 items · ⚡ 12 mins away       │
 *   │─────────────────────────────────────│
 *   │  [Store B Card]  Standard Delivery  │  ← further but 100 % FULL
 *   │  All 10 items · 🕒 25 mins away     │
 *   │─────────────────────────────────────│
 *   │  [Confirm & Proceed to Payment]     │  ← unlocked after selection
 *   └─────────────────────────────────────┘
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Zap,
  Clock,
  MapPin,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  ChevronRight,
  Store,
} from 'lucide-react'
import type { FulfillmentStore } from '@/app/api/stores/fulfillment/route'
import { cn } from '@/lib/utils'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StoreFulfillmentModalProps {
  open: boolean
  stores: FulfillmentStore[]
  totalItems: number
  onConfirm: (storeId: string, storeName: string) => void
  onClose: () => void
}

// ─── Option card ─────────────────────────────────────────────────────────────

function StoreOptionCard({
  store,
  index,
  selected,
  onSelect,
}: {
  store: FulfillmentStore
  index: number
  selected: boolean
  onSelect: () => void
}) {
  const isFull = store.fulfillmentType === 'FULL'
  const isExpress = store.etaMinutes <= 20
  const deliveryTag = isExpress ? 'Express Delivery' : 'Standard Delivery'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative w-full rounded-2xl border-2 p-4 text-left transition-all duration-200 active:scale-[0.99]',
        selected
          ? isFull
            ? 'border-[#0C831F] bg-[#F0FDF4]'
            : 'border-[#FF6B35] bg-[#FFF8F5]'
          : 'border-slate-100 bg-white hover:border-slate-200',
      )}
    >
      {/* Top row — store name + selection indicator */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black',
              isFull ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FFF7ED] text-[#F97316]',
            )}
          >
            {String.fromCharCode(65 + index)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-black text-slate-900">{store.storeName}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {deliveryTag}
            </p>
          </div>
        </div>

        {selected ? (
          <CheckCircle2
            className={cn(
              'mt-0.5 h-5 w-5 shrink-0',
              isFull ? 'text-[#0C831F]' : 'text-[#FF6B35]',
            )}
          />
        ) : (
          <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-slate-200" />
        )}
      </div>

      {/* Fulfillment pill */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold',
            isFull
              ? 'bg-[#DCFCE7] text-[#15803D]'
              : 'bg-[#FEF3C7] text-[#B45309]',
          )}
        >
          {isFull ? (
            <PackageCheck className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {store.fulfillmentLabel}
        </span>

        {/* ETA pill */}
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
          {isExpress ? <Zap className="h-3 w-3 text-amber-500" /> : <Clock className="h-3 w-3" />}
          {store.etaMinutes} mins
        </span>

        {/* Distance pill */}
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
          <MapPin className="h-3 w-3" />
          {store.distanceKm} km away
        </span>
      </div>

      {/* Missing items notice for partial stores */}
      {!isFull && store.missingItems.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Items not stocked here
          </p>
          <ul className="space-y-0.5">
            {store.missingItems.slice(0, 3).map((item) => (
              <li key={item.productId} className="text-[11px] text-amber-800">
                · {item.name}{' '}
                <span className="text-amber-600">(requested ×{item.requested})</span>
              </li>
            ))}
            {store.missingItems.length > 3 && (
              <li className="text-[11px] text-amber-600">
                +{store.missingItems.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Delivery fee */}
      <p className="mt-2.5 text-[11px] font-semibold text-slate-400">
        Delivery fee: {store.deliveryFee === 0 ? 'FREE' : `₹${store.deliveryFee}`}
      </p>
    </button>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function StoreFulfillmentModal({
  open,
  stores,
  totalItems,
  onConfirm,
  onClose,
}: StoreFulfillmentModalProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)

  const selectedStore = stores.find((s) => s.storeId === selectedStoreId)
  const canConfirm = Boolean(selectedStoreId && selectedStore)

  // Reset selection when modal re-opens
  const handleOpen = () => {
    if (open) setSelectedStoreId(null)
  }

  const handleConfirm = () => {
    if (!selectedStore) return
    onConfirm(selectedStore.storeId, selectedStore.storeName)
  }

  // Determine if we need to show a "split inventory" notice
  const hasPartial = stores.some((s) => s.fulfillmentType === 'PARTIAL')
  const hasFull = stores.some((s) => s.fulfillmentType === 'FULL')
  const showSplitNotice = hasPartial && hasFull

  return (
    <AnimatePresence onExitComplete={handleOpen}>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="fulfillment-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="fulfillment-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-xl rounded-t-[2rem] bg-white pb-safe"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-4">
              <div>
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-[#FF6B35]" />
                  <h2 className="text-base font-black text-slate-900">
                    Choose Fulfillment Store
                  </h2>
                </div>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {totalItems} item{totalItems !== 1 ? 's' : ''} in your cart
                  {showSplitNotice ? ' · Inventory split detected' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Inventory split notice banner */}
            {showSplitNotice && (
              <div className="mx-5 mb-3 flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <p className="text-[11px] font-semibold leading-relaxed text-blue-800">
                  The nearest store has partial stock. A further store carries your full order —
                  pick which matters most to you.
                </p>
              </div>
            )}

            {/* Store option cards */}
            <div className="space-y-3 overflow-y-auto px-5 pb-3" style={{ maxHeight: '55vh' }}>
              {stores.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <Store className="h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-500">No stores found nearby</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try expanding your delivery radius or check back later.
                  </p>
                </div>
              ) : (
                stores.slice(0, 4).map((store, idx) => (
                  <StoreOptionCard
                    key={store.storeId}
                    store={store}
                    index={idx}
                    selected={selectedStoreId === store.storeId}
                    onSelect={() => setSelectedStoreId(store.storeId)}
                  />
                ))
              )}
            </div>

            {/* Confirm button */}
            <div className="border-t border-slate-100 px-5 pb-6 pt-4">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition-all',
                  canConfirm
                    ? 'bg-[#FF6B35] shadow-lg shadow-orange-200/50 active:scale-[0.99]'
                    : 'bg-slate-200 text-slate-400',
                )}
              >
                <span>
                  {canConfirm
                    ? `Deliver from ${selectedStore?.storeName ?? 'selected store'}`
                    : 'Select a store to continue'}
                </span>
                <ChevronRight className="h-5 w-5" />
              </button>
              {canConfirm && selectedStore?.fulfillmentType === 'PARTIAL' && (
                <p className="mt-2 text-center text-[10px] font-semibold text-amber-600">
                  Missing items will be removed from your order at checkout.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
