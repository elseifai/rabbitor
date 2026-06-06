'use client'

import { useEffect, useRef, useState } from 'react'
import { RunningRabbit } from '@/components/track/RunningRabbit'

const RUN_DURATION_MS = 28000

export function RabbitProgressTrack({
  onProgressChange,
}: {
  onProgressChange?: (pct: number) => void
}) {
  const [progress, setProgress] = useState(0)
  const [complete, setComplete] = useState(false)
  const onProgressRef = useRef(onProgressChange)
  onProgressRef.current = onProgressChange

  useEffect(() => {
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const elapsed = now - start
      const pct = Math.min(100, (elapsed / RUN_DURATION_MS) * 100)
      const rounded = Math.floor(pct)

      setProgress(rounded)
      onProgressRef.current?.(pct)

      if (pct >= 100) {
        setComplete(true)
        return
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="flex flex-col items-center py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        Order Completion
      </p>

      <div className="relative mt-1 flex items-baseline justify-center">
        <span
          className={`font-display text-5xl font-black tabular-nums tracking-tighter transition-colors duration-500 ${
            complete ? 'text-[#22C55E]' : 'text-[#0F172A]'
          }`}
        >
          {progress}
        </span>
        <span
          className={`ml-0.5 text-2xl font-black ${
            complete ? 'text-[#22C55E]' : 'text-orange-500'
          }`}
        >
          %
        </span>
      </div>

      <div className="relative mt-6 w-full px-2">
        <div className="relative h-2 overflow-visible rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-none ${
              complete
                ? 'bg-[#22C55E]'
                : 'bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600'
            }`}
            style={{ width: `${progress}%` }}
          />

          <div
            className="absolute top-1/2 z-10 -translate-y-[calc(50%+18px)] will-change-[left]"
            style={{ left: `calc(${progress}% - 26px)` }}
          >
            <RunningRabbit running={!complete} />
          </div>
        </div>

        <div className="mt-1 flex justify-between text-[9px] font-bold text-slate-300">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  )
}
