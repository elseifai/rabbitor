'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, X, Keyboard } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  onScan: (barcode: string) => void
}

export function BarcodeScannerModal({ open, onClose, onScan }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [manual, setManual] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const containerId = 'inventory-barcode-scanner'

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const start = async () => {
      setError(null)
      setStarting(true)
      try {
        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        })
        scannerRef.current = scanner

        const cameras = await Html5Qrcode.getCameras()
        if (cancelled) return
        if (!cameras.length) {
          setError('No camera found. Enter barcode manually below.')
          return
        }

        const backCam =
          cameras.find((c) => /back|rear|environment/i.test(c.label)) ?? cameras[0]

        await scanner.start(
          backCam.id,
          { fps: 10, qrbox: { width: 280, height: 140 }, aspectRatio: 1.777 },
          (decoded) => {
            void scanner.stop().catch(() => undefined)
            scannerRef.current = null
            onScan(decoded.trim())
            onClose()
          },
          () => undefined,
        )
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Camera access denied. Enter barcode manually.',
          )
        }
      } finally {
        if (!cancelled) setStarting(false)
      }
    }

    void start()

    return () => {
      cancelled = true
      const scanner = scannerRef.current
      scannerRef.current = null
      if (scanner) {
        void scanner.stop().catch(() => undefined)
        try {
          scanner.clear()
        } catch {
          /* ignore */
        }
      }
    }
  }, [open, onClose, onScan])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Camera className="h-4 w-4 text-rabbit-600" />
            Scan barcode
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div
            id={containerId}
            className="overflow-hidden rounded-xl bg-black [&>video]:!rounded-xl"
          />
          {starting && (
            <p className="mt-2 text-center text-sm text-gray-500">Starting camera…</p>
          )}
          {error && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {error}
            </p>
          )}

          <div className="mt-4">
            <label className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              <Keyboard className="h-3.5 w-3.5" />
              Manual entry
            </label>
            <div className="flex gap-2">
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Type or paste barcode"
                className="flex-1 rounded-xl border px-3 py-2.5 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manual.trim()) {
                    onScan(manual.trim())
                    onClose()
                  }
                }}
              />
              <button
                type="button"
                disabled={!manual.trim()}
                onClick={() => {
                  onScan(manual.trim())
                  onClose()
                }}
                className="rounded-xl bg-rabbit-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Go
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
