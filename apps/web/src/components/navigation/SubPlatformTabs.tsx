'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SUB_PLATFORM_TABS, type SubPlatformId } from '@/lib/sub-platforms'
import { cn } from '@/lib/utils'

type SubPlatformTabsProps = {
  activeTab: SubPlatformId
  onChange: (tab: SubPlatformId) => void
  className?: string
}

export function SubPlatformTabs({ activeTab, onChange, className }: SubPlatformTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<SubPlatformId, HTMLButtonElement | null>>({
    all: null,
    grocery: null,
    fresh: null,
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
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
