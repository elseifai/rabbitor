'use client'

import { useState } from 'react'
import { Loader2, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

export function LogoutButton({
  className,
  label = 'Logout',
  compact = false,
}: {
  className?: string
  label?: string
  compact?: boolean
}) {
  const { logout, isLoggedIn } = useAuth()
  const [loading, setLoading] = useState(false)

  if (!isLoggedIn) return null

  const handleLogout = async () => {
    setLoading(true)
    try {
      await logout()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold text-red-500 transition hover:text-red-600 disabled:opacity-50',
        compact ? 'text-xs' : 'text-sm',
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {label}
    </button>
  )
}
