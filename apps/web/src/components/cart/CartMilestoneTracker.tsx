'use client'

import { useMemo } from 'react'
import { useCartStore } from '@/store'
import { cn } from '@/lib/utils'

export const FREE_DELIVERY_THRESHOLD = 199
export const DISCOUNT_THRESHOLD = 399
export const TIER_DISCOUNT_AMOUNT = 30

type MilestoneTier = 'delivery' | 'discount' | 'max'

function resolveMilestone(subtotal: number): {
  tier: MilestoneTier
  progressPercentage: number
  headline: string
  accent: string
} {
  if (subtotal < FREE_DELIVERY_THRESHOLD) {
    const remaining = Math.max(0, Math.ceil(FREE_DELIVERY_THRESHOLD - subtotal))
    return {
      tier: 'delivery',
      progressPercentage: Math.min(100, (subtotal / DISCOUNT_THRESHOLD) * 100),
      headline: `Add ₹${remaining} more for FREE delivery!`,
      accent: 'text-yellow-400',
    }
  }

  if (subtotal < DISCOUNT_THRESHOLD) {
    const remaining = Math.max(0, Math.ceil(DISCOUNT_THRESHOLD - subtotal))
    return {
      tier: 'discount',
      progressPercentage: Math.min(100, (subtotal / DISCOUNT_THRESHOLD) * 100),
      headline: `Free delivery unlocked! Add ₹${remaining} more to save flat ₹${TIER_DISCOUNT_AMOUNT}!`,
      accent: 'text-emerald-400',
    }
  }

  return {
    tier: 'max',
    progressPercentage: 100,
    headline: `Maximum savings unlocked — ₹${TIER_DISCOUNT_AMOUNT} off applied!`,
    accent: 'text-emerald-400',
  }
}

const FILL_STYLES: Record<MilestoneTier, string> = {
  delivery: 'bg-gradient-to-r from-pink-500 to-rose-500',
  discount: 'bg-gradient-to-r from-emerald-400 to-green-500',
  max: 'bg-gradient-to-r from-yellow-400 via-emerald-400 to-green-500',
}

const DELIVERY_TICK_PERCENT = (FREE_DELIVERY_THRESHOLD / DISCOUNT_THRESHOLD) * 100

export function CartMilestoneTracker({
  className,
  hideWhenEmpty = true,
  /** Pin above a fixed checkout bar (e.g. cart page). */
  stackAboveCheckout = false,
}: {
  className?: string
  hideWhenEmpty?: boolean
  stackAboveCheckout?: boolean
}) {
  const subtotal = useCartStore((s) => s.subtotal())
  const itemCount = useCartStore((s) => s.itemCount())

  const milestone = useMemo(() => resolveMilestone(subtotal), [subtotal])

  if (hideWhenEmpty && itemCount === 0) return null

  const deliveryUnlocked = subtotal >= FREE_DELIVERY_THRESHOLD
  const discountUnlocked = subtotal >= DISCOUNT_THRESHOLD

  return (
    <div
      className={cn(
        'fixed left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-2 rounded-2xl bg-gray-900 p-3 text-white shadow-xl transition-all duration-300',
        stackAboveCheckout ? 'bottom-[5.5rem]' : 'bottom-4',
        className,
      )}
      aria-label="Cart savings milestones"
      role="region"
    >
      <p className="text-sm font-bold leading-snug">
        <span className={cn(milestone.accent)}>{milestone.headline}</span>
      </p>

      <div className="relative w-full pb-4">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out',
              FILL_STYLES[milestone.tier],
            )}
            style={{ width: `${Math.min(milestone.progressPercentage, 100)}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={DISCOUNT_THRESHOLD}
            aria-valuenow={Math.round(subtotal)}
            aria-label={
              milestone.tier === 'delivery'
                ? 'Progress toward free delivery'
                : milestone.tier === 'discount'
                  ? 'Progress toward extra discount'
                  : 'All milestones unlocked'
            }
          />
        </div>

        {/* Tier tick — free delivery @ ₹199 */}
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2"
          style={{ left: `${DELIVERY_TICK_PERCENT}%` }}
        >
          <div
            className={cn(
              'h-3 w-0.5 -translate-x-1/2 rounded-full',
              deliveryUnlocked ? 'bg-emerald-400' : 'bg-gray-600',
            )}
          />
          <span
            className={cn(
              'absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-wide',
              deliveryUnlocked ? 'text-emerald-400' : 'text-gray-500',
            )}
          >
            ₹{FREE_DELIVERY_THRESHOLD}
          </span>
        </div>

        {/* Tier tick — ₹30 off @ ₹399 */}
        <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
          <div
            className={cn(
              'h-3 w-0.5 rounded-full',
              discountUnlocked ? 'bg-emerald-400' : 'bg-gray-600',
            )}
          />
          <span
            className={cn(
              'absolute right-0 top-3 whitespace-nowrap text-[9px] font-bold uppercase tracking-wide',
              discountUnlocked ? 'text-emerald-400' : 'text-gray-500',
            )}
          >
            ₹{DISCOUNT_THRESHOLD}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400">
        <span className={cn(deliveryUnlocked && 'text-emerald-400')}>
          {deliveryUnlocked ? '✓ Free delivery' : 'Free delivery'}
        </span>
        <span className={cn(discountUnlocked && 'text-emerald-400')}>
          {discountUnlocked ? `✓ ₹${TIER_DISCOUNT_AMOUNT} off` : `₹${TIER_DISCOUNT_AMOUNT} off`}
        </span>
      </div>
    </div>
  )
}
