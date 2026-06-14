'use client'

import { cn } from '@/lib/utils'
import {
  AUTH_ROLE_OPTIONS,
  type AuthRoleId,
  type AuthRoleOption,
} from '@/lib/auth-roles'

const ROLE_STYLES: Record<AuthRoleId, { border: string; bg: string; ring: string }> = {
  customer: {
    border: 'border-orange-200',
    bg: 'bg-orange-50/60',
    ring: 'ring-orange-500',
  },
  merchant: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/60',
    ring: 'ring-emerald-500',
  },
  rabbitor: {
    border: 'border-sky-200',
    bg: 'bg-sky-50/60',
    ring: 'ring-sky-500',
  },
  admin: {
    border: 'border-violet-200',
    bg: 'bg-violet-50/60',
    ring: 'ring-violet-500',
  },
}

type AuthRolePickerProps = {
  value: AuthRoleId
  onChange: (id: AuthRoleId, option: AuthRoleOption) => void
  className?: string
  compact?: boolean
}

export function AuthRolePicker({
  value,
  onChange,
  className,
  compact = false,
}: AuthRolePickerProps) {
  return (
    <div className={className}>
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
        I am a…
      </p>
      <div
        className={cn(
          'mt-3 grid gap-2',
          compact ? 'grid-cols-2' : 'grid-cols-2',
        )}
      >
        {AUTH_ROLE_OPTIONS.map((option) => {
          const selected = value === option.id
          const styles = ROLE_STYLES[option.id]

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id, option)}
              className={cn(
                'flex flex-col items-start rounded-xl border-2 p-3 text-left transition active:scale-[0.98]',
                selected
                  ? cn(styles.border, styles.bg, 'ring-2 ring-offset-1', styles.ring)
                  : 'border-orange-100 bg-white hover:border-orange-200 hover:bg-orange-50/30',
              )}
            >
              <span className="text-xl leading-none">{option.emoji}</span>
              <span className="mt-2 text-sm font-bold text-gray-900">{option.title}</span>
              {!compact && (
                <span className="mt-0.5 text-[11px] font-medium leading-tight text-gray-500">
                  {option.subtitle}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
