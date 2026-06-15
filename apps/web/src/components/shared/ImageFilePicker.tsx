'use client'

import { FileUploader } from '@/components/ui/file-uploader'

/** Legacy wrapper — delegates to native drag-and-drop uploader. */
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
  return (
    <FileUploader
      value={value}
      onChange={onChange}
      label={label}
      className={className}
      disabled={disabled}
      aspect="video"
    />
  )
}
