'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { DevRoleLoginPanel } from '@/components/auth/DevRoleLoginPanel'
import { GeoLocationPanel } from '@/components/location/GeoLocationPanel'
import { useAuth } from '@/context/AuthContext'
import { isDevSandboxClient } from '@/lib/dev-auth'

type Props = {
  user: {
    name: string | null
    phone: string | null
    email?: string | null
    displayName: string | null
    role?: string | null
  } | null
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return ''
  if (phone.length < 10) return phone
  return `+91 ${phone.slice(0, 2)}XXXX${phone.slice(-4)}`
}

function roleLabel(role?: string | null) {
  if (role === 'VENDOR') return 'Merchant'
  if (role === 'RABBITOR') return 'Rabbitor'
  if (role === 'ADMIN') return 'Admin'
  return 'Customer'
}

export function ProfileClient({ user: serverUser }: Props) {
  const router = useRouter()
  const { user: authUser, isLoggedIn, logout } = useAuth()
  const sandbox = isDevSandboxClient()

  const user = serverUser ?? (authUser
    ? {
        name: authUser.name,
        phone: authUser.phone ?? null,
        email: authUser.email ?? null,
        displayName: authUser.displayName ?? null,
        role: authUser.role,
      }
    : null)

  const handleLogout = async () => {
    await logout()
    router.refresh()
  }

  // DEV SANDBOX REFACTOR — profile entry is the role picker; no Google / email OTP here.
  if (!isLoggedIn || !user) {
    return (
      <div className="mx-auto max-w-[480px] px-4 py-6">
        <DevRoleLoginPanel
          mode="page"
          redirectOnSuccess={false}
          onSuccess={() => router.refresh()}
        />
      </div>
    )
  }

  const initials = (user.displayName ?? user.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const menu = [
    { label: 'My Orders', href: '/orders' },
    { label: 'Help & Support', href: '#' },
  ]

  return (
    <div className="mx-auto max-w-[480px] px-4 py-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF0EA] text-2xl font-black text-[#FF6B35]">
          {initials}
        </div>
        <h1 className="mt-3 text-lg font-bold">{user.displayName ?? user.name}</h1>
        <p className="text-sm text-gray-500">{maskPhone(user.phone) || user.email}</p>
        {sandbox && (
          <span className="mt-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            {roleLabel(user.role)} · Sandbox
          </span>
        )}
      </div>

      <div className="mt-6">
        <GeoLocationPanel />
      </div>

      <div className="mt-6 divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
        {menu.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between px-4 py-4 text-sm font-semibold text-gray-800"
          >
            {item.label}
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
        ))}
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center justify-between px-4 py-4 text-sm font-semibold text-red-500"
        >
          Logout
          <ChevronRight className="h-4 w-4 text-red-300" />
        </button>
      </div>

      {sandbox && (
        <div className="mt-8">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            Switch sandbox role
          </p>
          <DevRoleLoginPanel
            mode="inline"
            redirectOnSuccess={false}
            onSuccess={() => router.refresh()}
          />
        </div>
      )}
    </div>
  )
}
