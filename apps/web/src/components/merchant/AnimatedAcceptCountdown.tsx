'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

function secondsRemaining(fromIso: string, totalSeconds: number) {
  const elapsed = (Date.now() - new Date(fromIso).getTime()) / 1000
  return Math.max(0, Math.ceil(totalSeconds - elapsed))
}

export function AnimatedAcceptCountdown({
  createdAt,
  totalSeconds = 90,
  onExpired,
}: {
  createdAt: string
  totalSeconds?: number
  onExpired?: () => void
}) {
  const [remaining, setRemaining] = useState(() =>
    secondsRemaining(createdAt, totalSeconds),
  )

  useEffect(() => {
    const tick = () => {
      const next = secondsRemaining(createdAt, totalSeconds)
      setRemaining(next)
      if (next <= 0) onExpired?.()
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [createdAt, totalSeconds, onExpired])

  const progress = Math.max(0, Math.min(100, (remaining / totalSeconds) * 100))
  const urgent = remaining <= 20
  const circumference = 2 * Math.PI * 42
  const dashOffset = circumference - (progress / 100) * circumference

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="flex flex-col items-center py-2">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-slate-100"
          />
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn(
              'transition-all duration-500',
              urgent ? 'text-red-500' : 'text-[#FF6B35]',
            )}
          />
        </svg>
        <div
          className={cn(
            'relative flex flex-col items-center justify-center rounded-full',
            urgent && 'animate-pulse',
          )}
        >
          <span
            className={cn(
              'text-2xl font-black tabular-nums',
              urgent ? 'text-red-600' : 'text-slate-900',
            )}
          >
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            to accept
          </span>
        </div>
        {urgent && (
          <span className="absolute -inset-1 rounded-full border-2 border-red-400/40 animate-ping" />
        )}
      </div>
      <p
        className={cn(
          'mt-2 text-center text-[10px] font-black uppercase tracking-wider',
          urgent ? 'text-red-600' : 'text-slate-500',
        )}
      >
        {urgent ? 'Accept now — order may auto-cancel' : 'New order waiting for confirmation'}
      </p>
    </div>
  )
}

export function HandoverCountdown({
  startedAt,
  totalSeconds = 300,
}: {
  startedAt: string
  totalSeconds?: number
}) {
  const [remaining, setRemaining] = useState(() =>
    secondsRemaining(startedAt, totalSeconds),
  )

  useEffect(() => {
    const tick = () => setRemaining(secondsRemaining(startedAt, totalSeconds))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [startedAt, totalSeconds])

  const progress = Math.max(0, Math.min(100, (remaining / totalSeconds) * 100))
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-emerald-800">
        <span>Handover timer</span>
        <span className={remaining <= 60 ? 'text-red-600' : 'text-emerald-700'}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#0C831F] transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[10px] font-medium text-emerald-700">
        Rider at store — hand over packed order before timer ends
      </p>
    </div>
  )
}
