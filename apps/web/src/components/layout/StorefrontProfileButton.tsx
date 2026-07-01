'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StorefrontProfileButton({ className }: { className?: string }) {
  const pathname = usePathname()
  const active = pathname.startsWith('/profile')

  return (
    <Link
      href="/profile"
      aria-label="Profile"
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#1C1C1C] shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-colors',
        active && 'ring-2 ring-[#FF6B35]/30',
        className,
      )}
    >
      <User className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
    </Link>
  )
}
