'use client'

import { useEffect } from 'react'

export function RabbitSplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
      <div className="rabbit-splash-pop text-7xl">🐰</div>
      <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-[#FF6B35]">
        rabbit
      </h1>
      <p className="mt-2 max-w-xs text-center text-sm font-medium text-gray-500">
        Delivering happiness from your neighbourhood
      </p>
      <div className="mt-10 flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-[#FF6B35] rabbit-dot-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  )
}
