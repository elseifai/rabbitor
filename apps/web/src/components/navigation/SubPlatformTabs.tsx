'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SUB_PLATFORM_TABS, type SubPlatformId } from '@/lib/sub-platforms'
import { cn } from '@/lib/utils'

type SubPlatformTabsProps = {
  activeTab: SubPlatformId
  onChange: (tab: SubPlatformId) => void
  className?: string
  labelOverrides?: Partial<Record<SubPlatformId, string>>
  variant?: 'pill' | 'cards'
}

export function SubPlatformTabs({
  activeTab,
  onChange,
  className,
  labelOverrides,
  variant = 'pill',
}: SubPlatformTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<SubPlatformId, HTMLButtonElement | null>>({
    all: null,
    grocery: null,
    restaurants: null,
    fashion: null,
  })
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  const measureIndicator = useCallback(() => {
    const container = containerRef.current
    const activeEl = tabRefs.current[activeTab]
    if (!container || !activeEl) return

    const containerRect = container.getBoundingClientRect()
    const tabRect = activeEl.getBoundingClientRect()
    setIndicator({
      left: tabRect.left - containerRect.left,
      width: tabRect.width,
    })
  }, [activeTab])

  useLayoutEffect(() => {
    measureIndicator()
  }, [measureIndicator])

  useEffect(() => {
    const onResize = () => measureIndicator()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measureIndicator])

  const activeTheme = SUB_PLATFORM_TABS.find((t) => t.id === activeTab) ?? SUB_PLATFORM_TABS[0]

  const displayLabel = (tab: (typeof SUB_PLATFORM_TABS)[number]) => {
    const override = labelOverrides?.[tab.id]
    if (override) {
      if (tab.id === 'restaurants') return 'Restaurants'
      if (tab.id === 'fashion') return 'Boutique'
      return override
    }
    if (tab.id === 'restaurants') return 'Restaurants'
    if (tab.id === 'fashion') return 'Boutique'
    return tab.label
  }

  if (variant === 'cards') {
    return (
      <div className={cn('py-1', className)}>
        <div
          className="flex gap-4 overflow-x-auto scrollbar-hide"
          role="tablist"
          aria-label="Sub-platform navigation"
        >
          {SUB_PLATFORM_TABS.map((tab) => {
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onChange(tab.id)}
                className={cn(
                  'flex h-12 shrink-0 items-center rounded-[24px] px-6 text-sm font-semibold shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-colors',
                  selected
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-white text-[#1C1C1C]',
                )}
              >
                {displayLabel(tab)}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('px-4 py-2.5', className)}>
      <div
        ref={containerRef}
        className="relative flex gap-1 overflow-x-auto rounded-full bg-[#F3F4F6] p-1 scrollbar-hide"
        role="tablist"
        aria-label="Sub-platform navigation"
      >
        <div
          className={cn(
            'pointer-events-none absolute top-1 bottom-1 rounded-full transition-[left,width,background,box-shadow] duration-300 ease-out will-change-[left,width]',
            activeTheme.activePill,
          )}
          style={{
            left: indicator.left,
            width: indicator.width,
            transform: 'translateZ(0)',
          }}
          aria-hidden
        />

        {SUB_PLATFORM_TABS.map((tab) => {
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative z-[1] shrink-0 rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors duration-200',
                selected ? tab.activeText : tab.idleText,
              )}
            >
              {labelOverrides?.[tab.id] ?? tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
