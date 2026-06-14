'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { DevRoleLoginPanel } from '@/components/auth/DevRoleLoginPanel'
import { GeoLocationPanel } from '@/components/location/GeoLocationPanel'
import { SupportChatDrawer } from '@/components/support/SupportChatDrawer'
import { useAuth } from '@/context/AuthContext'
import { isDevSandboxClient } from '@/lib/dev-auth'
import { loginPathForRole } from '@/lib/auth-routing'

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
  const [supportOpen, setSupportOpen] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

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

  useEffect(() => {
    if (isLoggedIn && user) return
    if (sandbox) return
    setRedirecting(true)
    router.replace(loginPathForRole('customer', '/profile'))
  }, [isLoggedIn, user, sandbox, router])

  if (!isLoggedIn || !user) {
    if (sandbox) {
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

    return (
      <div className="mx-auto flex max-w-[480px] items-center justify-center px-4 py-20 text-sm font-semibold text-slate-400">
        {redirecting ? 'Opening sign in…' : 'Loading profile…'}
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
    { label: 'My Orders', href: '/orders', action: null as (() => void) | null },
    { label: 'Help & Support', href: null, action: () => setSupportOpen(true) },
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
        {menu.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between px-4 py-4 text-sm font-semibold text-gray-800"
            >
              {item.label}
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              onClick={item.action ?? undefined}
              className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-semibold text-gray-800"
            >
              {item.label}
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
          ),
        )}
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

      <SupportChatDrawer open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  )
}
