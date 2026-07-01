'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Flame, Mic, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROTATING_KEYWORDS = [
  'milk and bread',
  'fresh Alphonso mangoes',
  'running shoes',
  'snacks & munchies',
  'attena / charging cables',
] as const

const TRENDING_SEARCHES = [
  'Amul Taaza Milk',
  'Britannia Bread',
  'Maggi 2-Minute Noodles',
  'Alphonso Mangoes',
  'Lay\'s Classic Salted',
  'Type-C Charging Cable',
  'Fresh Paneer',
  'Tata Sampann Atta',
] as const

const CYCLE_MS = 3000
const PLACEHOLDER_LINE_PX = 20

export type RotatingSearchBarProps = {
  value: string
  onChange: (value: string) => void
  /** LIVE ECOSYSTEM UPGRADE — fires on Enter / search icon click */
  onSubmit?: (value: string) => void
  onTrendingSelect?: (term: string) => void
  className?: string
  variant?: 'default' | 'premium'
  /** Shop or product matches rendered below the trending panel */
  results?: ReactNode
}

export function RotatingSearchBar({
  value,
  onChange,
  onSubmit,
  onTrendingSelect,
  className,
  variant = 'default',
  results,
}: RotatingSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [keywordIndex, setKeywordIndex] = useState(0)
  const [focused, setFocused] = useState(false)
  const [slidePhase, setSlidePhase] = useState<'idle' | 'exit' | 'enter'>('idle')

  const showRotatingPlaceholder = !focused && value.trim().length === 0
  const showDropdown = focused

  const filteredTrending = TRENDING_SEARCHES.filter((term) => {
    const q = value.trim().toLowerCase()
    if (!q) return true
    return term.toLowerCase().includes(q)
  })

  useEffect(() => {
    if (!showRotatingPlaceholder) return

    const timer = window.setInterval(() => {
      setSlidePhase('exit')
      window.setTimeout(() => {
        setKeywordIndex((i) => (i + 1) % ROTATING_KEYWORDS.length)
        setSlidePhase('enter')
        window.setTimeout(() => setSlidePhase('idle'), 320)
      }, 280)
    }, CYCLE_MS)

    return () => window.clearInterval(timer)
  }, [showRotatingPlaceholder])

  const handleFocus = useCallback(() => {
    setFocused(true)
    setSlidePhase('idle')
  }, [])

  const handleBlur = useCallback(() => {
    window.setTimeout(() => setFocused(false), 120)
  }, [])

  const handleTrendingClick = useCallback(
    (term: string) => {
      onChange(term)
      onTrendingSelect?.(term)
      onSubmit?.(term)
      inputRef.current?.focus()
    },
    [onChange, onTrendingSelect, onSubmit],
  )

  const handleSubmitSearch = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit?.(trimmed)
  }, [value, onSubmit])

  const activeKeyword = ROTATING_KEYWORDS[keywordIndex]
  const isPremium = variant === 'premium'

  return (
    <div className={cn('relative w-full', className)}>
      <div className={cn('relative w-full', isPremium ? 'h-14' : 'h-11')}>
        <Search
          className={cn(
            'pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 text-[#878787]',
            isPremium ? 'left-4 h-5 w-5' : 'left-3 h-4 w-4',
          )}
          aria-hidden
        />

        <input
          ref={inputRef}
          type="search"
          role="searchbox"
          aria-label="Search products and stores"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSubmitSearch()
            }
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isPremium ? 'Search for "Milk, Fruits, Atta"' : undefined}
          className={cn(
            'relative z-[1] w-full text-[#1C1C1C] outline-none transition-[box-shadow,background-color,border-color]',
            isPremium
              ? 'h-14 rounded-[28px] bg-white pl-12 pr-12 text-base shadow-[0_4px_20px_rgba(0,0,0,0.08)] placeholder:text-[#878787] focus:shadow-[0_6px_24px_rgba(0,0,0,0.1)]'
              : 'h-11 rounded-xl border border-transparent bg-[#F0F0F0] pl-10 pr-10 text-[13px] ring-[#FF6B35]/30 focus:border-[#FF6B35]/25 focus:bg-white focus:shadow-sm focus:ring-2',
          )}
          autoComplete="off"
          spellCheck={false}
        />

        {isPremium ? (
          <Mic
            className="pointer-events-none absolute right-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[#878787]"
            aria-hidden
          />
        ) : (
          <button
            type="button"
            onClick={handleSubmitSearch}
            className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#878787] hover:bg-white hover:text-[#FF6B35]"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        )}

        {!isPremium && showRotatingPlaceholder && (
          <div
            className="pointer-events-none absolute inset-y-0 left-10 right-3 z-[2] flex items-center overflow-hidden text-[13px]"
            aria-hidden
          >
            <span className="shrink-0 text-[#878787]">Search&nbsp;&quot;</span>
            <span
              className="relative min-w-0 flex-1 overflow-hidden"
              style={{ height: PLACEHOLDER_LINE_PX }}
            >
              <span
                key={keywordIndex}
                className={cn(
                  'absolute left-0 top-0 block max-w-full truncate font-medium text-[#5C5C5C]',
                  slidePhase === 'exit' && 'animate-search-placeholder-exit',
                  slidePhase === 'enter' && 'animate-search-placeholder-enter',
                  slidePhase === 'idle' && 'translate-y-0 opacity-100',
                )}
                style={{ height: PLACEHOLDER_LINE_PX, lineHeight: `${PLACEHOLDER_LINE_PX}px` }}
              >
                {activeKeyword}
              </span>
            </span>
            <span className="shrink-0 text-[#878787]">&quot;</span>
          </div>
        )}
      </div>

      {showDropdown && (filteredTrending.length > 0 || results) && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-[#EBEBEB] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
          role="listbox"
          aria-label="Search suggestions"
        >
          {filteredTrending.length > 0 && (
            <div className={cn('px-3 py-2.5', results && 'border-b border-[#F0F0F0]')}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#878787]">
                Trending Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {filteredTrending.map((term) => (
                  <button
                    key={term}
                    type="button"
                    role="option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleTrendingClick(term)}
                    className="inline-flex items-center gap-1 rounded-full border border-[#FFE4D6] bg-[#FFF8F4] px-2.5 py-1 text-[11px] font-semibold text-[#D4380D] transition hover:border-[#FF6B35]/40 hover:bg-[#FFEDE4]"
                  >
                    <Flame className="h-3 w-3 shrink-0 text-[#FF6B35]" aria-hidden />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {results}
        </div>
      )}
    </div>
  )
}
