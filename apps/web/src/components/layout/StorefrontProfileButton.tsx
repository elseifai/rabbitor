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
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
        active
          ? 'border-[#FF6B35]/30 bg-[#FFF5F2] text-[#FF6B35]'
          : 'border-[#F0F0F0] bg-white text-[#878787] hover:border-[#FF6B35]/20 hover:text-[#FF6B35]',
        className,
      )}
    >
      <User className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
    </Link>
  )
}
