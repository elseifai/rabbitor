'use client'

import { DevRoleLoginPanel } from '@/components/auth/DevRoleLoginPanel'

/** @deprecated Use DevRoleLoginPanel — kept for backwards compatibility. */
export function DevSandboxLogin({ variant = 'card' }: { variant?: 'card' | 'compact' }) {
  return (
    <DevRoleLoginPanel
      mode={variant === 'compact' ? 'inline' : 'page'}
    />
  )
}
