'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { ImageIcon, Loader2, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: formData, credentials: 'include' })
  const json = await res.json()
  if (!json.success || !json.data?.url) {
    throw new Error(json.error ?? 'Upload failed')
  }
  return String(json.data.url)
}

export function FileUploader({
  value,
  onChange,
  label = 'Upload image',
  hint = 'Drag & drop or click to browse · JPG, PNG, WebP · max 5 MB',
  className,
  disabled,
  aspect = 'video',
}: {
  value: string | null
  onChange: (url: string | null) => void
  label?: string
  hint?: string
  className?: string
  disabled?: boolean
  aspect?: 'video' | 'square' | 'banner'
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0]
      if (!file) return
      setError(null)
      setUploading(true)
      try {
        const url = await uploadFile(file)
        onChange(url)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [onChange],
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: (files) => void onDrop(files),
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    disabled: disabled || uploading,
    onDropRejected: () => setError('Invalid file — use JPG/PNG/WebP under 5 MB'),
  })

  const aspectClass =
    aspect === 'square' ? 'aspect-square' : aspect === 'banner' ? 'aspect-[3/1]' : 'aspect-video'

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 antialiased">
          {label}
        </span>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600"
          >
            <X className="h-3 w-3" />
            Remove
          </button>
        )}
      </div>

      <div
        {...getRootProps()}
        className={cn(
          'group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200',
          'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]',
          aspectClass,
          isDragActive && !isDragReject && 'border-orange-400 bg-orange-50/80 ring-2 ring-orange-200',
          isDragReject && 'border-rose-300 bg-rose-50/60',
          !isDragActive && 'border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 hover:border-orange-300',
          (disabled || uploading) && 'pointer-events-none opacity-60',
        )}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-xs font-semibold text-slate-500">Uploading…</p>
          </div>
        ) : value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition group-hover:bg-slate-900/40 group-hover:opacity-100">
              <span className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-slate-800 shadow-lg">
                <UploadCloud className="h-4 w-4" />
                Replace image
              </span>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
              {isDragActive ? (
                <UploadCloud className="h-6 w-6 text-orange-500" />
              ) : (
                <ImageIcon className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 antialiased">
                {isDragActive ? 'Drop to upload' : 'Drag & drop your image'}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400">{hint}</p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  )
}

export { uploadFile }
