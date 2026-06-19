'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarRating({
  value,
  onChange,
  size = 'md',
  readOnly = false,
}: {
  value: number
  onChange?: (n: number) => void
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
}) {
  const sizeClass =
    size === 'lg' ? 'h-9 w-9' : size === 'sm' ? 'h-5 w-5' : 'h-8 w-8'

  return (
    <div className="flex gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={cn('rounded-full p-0.5 transition-transform', !readOnly && 'hover:scale-110 active:scale-95')}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              sizeClass,
              n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200',
            )}
          />
        </button>
      ))}
    </div>
  )
}
