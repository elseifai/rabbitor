'use client'

import { useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SwipeActionButton({
  label,
  onConfirm,
  disabled,
  tone = 'green',
}: {
  label: string
  onConfirm: () => void
  disabled?: boolean
  tone?: 'green' | 'dark' | 'orange'
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)

  const threshold = 0.78

  const reset = () => {
    setDragX(0)
    setDragging(false)
  }

  const handleEnd = (width: number) => {
    if (width > 0 && dragX / width >= threshold) {
      onConfirm()
    }
    reset()
  }

  return (
    <div
      ref={trackRef}
      className={cn(
        'relative h-14 overflow-hidden rounded-2xl select-none touch-none',
        tone === 'green' ? 'bg-[#0C831F]' : tone === 'orange' ? 'bg-orange-500' : 'bg-[#1C1C1C]',
        disabled && 'opacity-50',
      )}
      onPointerDown={(e) => {
        if (disabled) return
        setDragging(true)
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!dragging || !trackRef.current || disabled) return
        const rect = trackRef.current.getBoundingClientRect()
        const max = rect.width - 56
        const next = Math.max(0, Math.min(max, e.clientX - rect.left - 28))
        setDragX(next)
      }}
      onPointerUp={(e) => {
        if (!trackRef.current) return
        handleEnd(trackRef.current.clientWidth)
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      }}
      onPointerCancel={reset}
    >
      <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-white/90">
        {label}
      </p>
      <div
        className="absolute left-1 top-1 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md transition-transform"
        style={{ transform: `translateX(${dragX}px)` }}
      >
        <ChevronRight
          className={cn(
            'h-6 w-6',
            tone === 'green' ? 'text-[#0C831F]' : tone === 'orange' ? 'text-orange-500' : 'text-[#1C1C1C]',
          )}
        />
      </div>
    </div>
  )
}
