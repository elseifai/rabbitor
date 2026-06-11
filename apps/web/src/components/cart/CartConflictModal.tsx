'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, ArrowRightLeft, ShoppingBag, X } from 'lucide-react'
import { useCartStore } from '@/store'
import { cn } from '@/lib/utils'

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    const scrollY = window.scrollY
    const { style } = document.body
    const prevOverflow = style.overflow
    const prevPosition = style.position
    const prevTop = style.top
    const prevWidth = style.width

    style.overflow = 'hidden'
    style.position = 'fixed'
    style.top = `-${scrollY}px`
    style.width = '100%'

    return () => {
      style.overflow = prevOverflow
      style.position = prevPosition
      style.top = prevTop
      style.width = prevWidth
      window.scrollTo(0, scrollY)
    }
  }, [locked])
}

function StoreBadge({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF3ED] text-sm font-bold text-[#FF6B35] ring-1 ring-[#FF6B35]/20"
    >
      {initial}
    </span>
  )
}

export function CartConflictModal() {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const [mounted, setMounted] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [replacing, setReplacing] = useState(false)

  const cartConflict = useCartStore((s) => s.cartConflict)
  const clearConflict = useCartStore((s) => s.clearConflict)
  const clearAndAddItem = useCartStore((s) => s.clearAndAddItem)

  const isOpen = mounted && cartConflict !== null

  useBodyScrollLock(isOpen)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearConflict()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, clearConflict])

  useEffect(() => {
    if (!isOpen) return
    const timer = window.setTimeout(() => cancelRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleCancel = useCallback(() => {
    clearConflict()
  }, [clearConflict])

  const handleReplace = useCallback(() => {
    if (!cartConflict) return

    setReplacing(true)
    const { incomingItem } = cartConflict

    clearAndAddItem(incomingItem)
    clearConflict()

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([12, 40, 12])
    }

    setToast(`Cart updated · ${incomingItem.storeName}`)
    setReplacing(false)
  }, [cartConflict, clearAndAddItem, clearConflict])

  if (!mounted || !cartConflict) return null

  const { incomingItem, existingStoreName } = cartConflict

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4"
        role="presentation"
      >
        <button
          type="button"
          aria-label="Dismiss cart conflict dialog"
          className="absolute inset-0 bg-[#1C1C1C]/55 backdrop-blur-[2px]"
          onClick={handleCancel}
        />

        <div
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className={cn(
            'relative z-[201] w-full max-w-md overflow-hidden',
            'rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem]',
            'animate-slide-up motion-reduce:animate-none',
            'pb-[max(1rem,env(safe-area-inset-bottom))]',
          )}
        >
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#E8E8E8] sm:hidden" />

          <button
            type="button"
            onClick={handleCancel}
            className="absolute right-4 top-4 rounded-full p-2 text-[#878787] transition hover:bg-[#F8F8F8] hover:text-[#1C1C1C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B35]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF8E6] text-[#E8A317]">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 pr-8">
                <h2
                  id={titleId}
                  className="text-lg font-bold leading-tight text-[#1C1C1C] sm:text-xl"
                >
                  Replace cart items?
                </h2>
                <p
                  id={descriptionId}
                  className="mt-2 text-sm leading-relaxed text-[#5C5C5C]"
                >
                  Your cart contains items from{' '}
                  <span className="font-semibold text-[#1C1C1C]">{existingStoreName}</span>.
                  Do you want to discard these items and add products from{' '}
                  <span className="font-semibold text-[#1C1C1C]">{incomingItem.storeName}</span>{' '}
                  instead?
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#F0F0F0] bg-[#FAFAFA] p-4">
              <div className="flex items-center gap-3">
                <StoreBadge name={existingStoreName} />
                <ArrowRightLeft className="h-4 w-4 shrink-0 text-[#B8B8B8]" aria-hidden />
                <StoreBadge name={incomingItem.storeName} />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-[#878787]">
                <ShoppingBag className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">
                  Adding <span className="font-medium text-[#1C1C1C]">{incomingItem.name}</span>
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                ref={cancelRef}
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-xl border border-[#E8E8E8] bg-white py-3.5 text-sm font-bold text-[#1C1C1C] transition hover:bg-[#F8F8F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B35]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReplace}
                disabled={replacing}
                className={cn(
                  'flex-1 rounded-xl bg-[#FF6B35] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#FF6B35]/25',
                  'transition hover:bg-[#E85A24] active:scale-[0.98]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B35]',
                  'disabled:opacity-70',
                )}
              >
                {replacing ? 'Updating…' : 'Replace Items'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-[max(5.5rem,calc(5rem+env(safe-area-inset-bottom)))] left-4 right-4 z-[202]',
            'mx-auto max-w-sm rounded-2xl bg-[#0C831F] px-4 py-3.5 text-center text-sm font-bold text-white shadow-xl',
            'animate-slide-up motion-reduce:animate-none',
          )}
        >
          {toast}
        </div>
      )}
    </>,
    document.body,
  )
}
