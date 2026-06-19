'use client'

import { useCallback, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const THUMB_SIZE = 48
const THRESHOLD = 0.68

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
  const dragXRef = useRef(0)
  const draggingRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const [dragX, setDragX] = useState(0)

  const maxDrag = useCallback(() => {
    const width = trackRef.current?.clientWidth ?? 0
    return Math.max(0, width - THUMB_SIZE - 8)
  }, [])

  const setDragPosition = useCallback((x: number) => {
    dragXRef.current = x
    setDragX(x)
  }, [])

  const reset = useCallback(() => {
    draggingRef.current = false
    pointerIdRef.current = null
    setDragPosition(0)
  }, [setDragPosition])

  const finishDrag = useCallback(() => {
    const max = maxDrag()
    const ratio = max > 0 ? dragXRef.current / max : 0
    if (ratio >= THRESHOLD) {
      setDragPosition(max)
      onConfirm()
    }
    reset()
  }, [maxDrag, onConfirm, reset, setDragPosition])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return
    e.preventDefault()
    draggingRef.current = true
    pointerIdRef.current = e.pointerId
    trackRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || disabled || pointerIdRef.current !== e.pointerId) return
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const max = maxDrag()
    const x = Math.max(0, Math.min(max, e.clientX - rect.left - THUMB_SIZE / 2 - 4))
    setDragPosition(x)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return
    if (trackRef.current?.hasPointerCapture(e.pointerId)) {
      trackRef.current.releasePointerCapture(e.pointerId)
    }
    finishDrag()
  }

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return
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
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-white/90">
        {label}
      </p>
      <div
        className="absolute left-1 top-1 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md will-change-transform"
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
