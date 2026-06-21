'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Store, X } from 'lucide-react'
import type { FulfillmentStore } from '@/lib/store-fulfillment'
import { resolveImageSrc } from '@/lib/image-url'
import { cn } from '@/lib/utils'

export interface AlternativeStoreSwitcherSheetProps {
  open: boolean
  stores: FulfillmentStore[]
  initialStoreId?: string | null
  onProceed: (storeId: string, storeName: string) => void
  onClose: () => void
}

function formatEtaRange(etaMinutes: number): string {
  const low = Math.max(5, etaMinutes - 5)
  const high = etaMinutes + 5
  return `${low}-${high} Mins`
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`
  return `${km.toFixed(1)} km away`
}

function formatRating(rating: number): string {
  return rating > 0 ? rating.toFixed(1) : '4.2'
}

function StoreSwitcherRow({
  store,
  selected,
  onSelect,
}: {
  store: FulfillmentStore
  selected: boolean
  onSelect: () => void
}) {
  const imageSrc = resolveImageSrc(store.imageUrl, '')

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left transition-all duration-200 active:scale-[0.99]',
        selected
          ? 'border-emerald-400 shadow-md shadow-emerald-100/80 ring-1 ring-emerald-200'
          : 'border-slate-100 hover:border-slate-200 hover:shadow-sm',
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          selected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white',
        )}
        aria-hidden
      >
        {selected && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>

      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-50">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={store.storeName}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <Store className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">{store.storeName}</p>
        <p className="text-xs text-gray-500">{formatDistance(store.distanceKm)}</p>
        <p className="mt-0.5 text-xs font-medium text-amber-600">
          ⭐ {formatRating(store.ratingAvg)}
        </p>
      </div>

      <span className="shrink-0 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        {formatEtaRange(store.etaMinutes)}
      </span>
    </button>
  )
}

export function AlternativeStoreSwitcherSheet({
  open,
  stores,
  initialStoreId,
  onProceed,
  onClose,
}: AlternativeStoreSwitcherSheetProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const preferred =
      initialStoreId ??
      stores.find((s) => s.fulfillmentType === 'FULL')?.storeId ??
      stores[0]?.storeId ??
      null
    setSelectedStoreId(preferred)
  }, [open, initialStoreId, stores])

  const selectedStore = stores.find((s) => s.storeId === selectedStoreId)
  const canProceed = Boolean(selectedStoreId && selectedStore)

  const handleProceed = () => {
    if (!selectedStore) return
    onProceed(selectedStore.storeId, selectedStore.storeName)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="switcher-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key="switcher-sheet"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-[90] mx-auto max-w-md pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="rounded-t-3xl bg-white p-5 shadow-2xl">
              <div className="mb-1 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-slate-200" />
              </div>

              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl leading-none" aria-hidden>
                    ⚠️
                  </span>
                  <p className="text-sm font-semibold leading-snug text-slate-800">
                    Some items are unserviceable at your current store. Select an alternative store
                    below to complete your order.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[50vh] space-y-2.5 overflow-y-auto pr-0.5">
                {stores.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                    <Store className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      No alternative stores nearby
                    </p>
                  </div>
                ) : (
                  stores.map((store) => (
                    <StoreSwitcherRow
                      key={store.storeId}
                      store={store}
                      selected={selectedStoreId === store.storeId}
                      onSelect={() => setSelectedStoreId(store.storeId)}
                    />
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={handleProceed}
                disabled={!canProceed}
                className={cn(
                  'mt-5 w-full rounded-2xl py-4 text-sm font-black uppercase tracking-wide transition-all',
                  canProceed
                    ? 'bg-slate-900 text-white shadow-lg active:scale-[0.99]'
                    : 'cursor-not-allowed bg-slate-200 text-slate-400',
                )}
              >
                Proceed to Payment
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
