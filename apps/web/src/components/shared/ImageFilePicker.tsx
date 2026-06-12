'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { uploadProductImage } from '@/lib/upload-product-image'
import { cn } from '@/lib/utils'

// PLATFORM CORE RESOLUTION — system browse image upload
export function ImageFilePicker({
  value,
  onChange,
  label = 'Product photo',
  className,
  disabled,
}: {
  value: string | null
  onChange: (url: string | null) => void
  label?: string
  className?: string
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      const url = await uploadProductImage(file)
      onChange(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload image')
      onChange(null)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={cn('space-y-1', className)}>
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-orange-100 bg-orange-50/30 disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex items-center gap-2 text-sm text-gray-500">
            <Camera className="h-4 w-4" />
            Browse to upload image
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
        }}
      />
      {value && !uploading && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex items-center gap-1 text-xs text-red-500 hover:underline"
        >
          <X className="h-3 w-3" /> Remove image
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
