'use client'

import { useCallback, useEffect, useRef } from 'react'

export function useOrderAlert() {
  const intervalRef = useRef<number | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const activeRef = useRef(false)

  const playPing = useCallback(() => {
    if (typeof window === 'undefined') return

    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    if (!ctxRef.current) {
      ctxRef.current = new AudioCtx()
    }

    const ctx = ctxRef.current
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.46)
  }, [])

  const start = useCallback(() => {
    if (activeRef.current) return
    activeRef.current = true
    playPing()
    intervalRef.current = window.setInterval(playPing, 2200)

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([80, 60, 80])
    }
  }, [playPing])

  const stop = useCallback(() => {
    activeRef.current = false
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => () => stop(), [stop])

  return { start, stop, isActive: () => activeRef.current }
}
