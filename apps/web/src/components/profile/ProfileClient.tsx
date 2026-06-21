'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DevRoleLoginPanel } from '@/components/auth/DevRoleLoginPanel'
import { GeoLocationPanel } from '@/components/location/GeoLocationPanel'
import { SupportChatDrawer } from '@/components/support/SupportChatDrawer'
import { useAuth } from '@/context/AuthContext'
import { isDevSandboxClient } from '@/lib/dev-auth'
import { loginPathForRole } from '@/lib/auth-routing'
import { cn } from '@/lib/utils'

type Props = {
  user: {
    name: string | null
    phone: string | null
    email?: string | null
    displayName: string | null
    role?: string | null
  } | null
}

type MenuItem = {
  icon: string
  label: string
  href?: string
  onClick?: () => void
  muted?: boolean
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return phone
  const local = digits.length > 10 ? digits.slice(-10) : digits
  return `+91 ${local.slice(0, 2)}XXXX${local.slice(-4)}`
}

function roleLabel(role?: string | null) {
  if (role === 'VENDOR') return 'Merchant'
  if (role === 'RABBITOR') return 'Rabbitor'
  if (role === 'ADMIN') return 'Admin'
  return 'Customer'
}

function MenuSection({
  title,
  items,
}: {
  title: string
  items: MenuItem[]
}) {
  return (
    <div>
      <h3 className="mb-2 pl-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {items.map((item, idx) => {
          const rowClass = cn(
            'flex cursor-pointer items-center justify-between p-3.5 transition-colors hover:bg-slate-50',
            idx !== items.length - 1 && 'border-b border-slate-100',
          )
          const inner = (
            <>
              <div className="flex items-center gap-3.5">
                <span className="text-base text-[#FF6B35]">{item.icon}</span>
                <span className="text-sm font-semibold text-slate-800">{item.label}</span>
              </div>
              <span className="text-xs font-bold text-slate-400">❯</span>
            </>
          )

          if (item.href) {
            return (
              <Link key={item.label} href={item.href} className={rowClass}>
                {inner}
              </Link>
            )
          }

          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={cn('w-full text-left', rowClass, item.muted && 'hover:bg-[#FFF5F2] group')}
            >
              {item.muted ? (
                <>
                  <div className="flex items-center gap-3.5">
                    <span className="text-base text-gray-400 transition-colors group-hover:text-[#FF6B35]">
                      {item.icon}
                    </span>
                    <span className="text-sm font-bold text-slate-700 transition-colors group-hover:text-[#FF6B35]">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 transition-colors group-hover:text-[#FF6B35]">
                    ❯
                  </span>
                </>
              ) : (
                inner
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ProfileClient({ user: serverUser }: Props) {
  const router = useRouter()
  const { user: authUser, isLoggedIn, logout } = useAuth()
  const sandbox = isDevSandboxClient()
  const [supportOpen, setSupportOpen] = useState(false)
  const [addressesOpen, setAddressesOpen] = useState(false)
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
        <div className="mx-auto min-h-screen max-w-md border-x border-gray-100 bg-slate-50 px-4 py-6">
          <DevRoleLoginPanel
            mode="page"
            redirectOnSuccess={false}
            onSuccess={() => router.refresh()}
          />
        </div>
      )
    }

    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center border-x border-gray-100 bg-slate-50 px-4 py-20 text-sm font-semibold text-slate-400">
        {redirecting ? 'Opening sign in…' : 'Loading profile…'}
      </div>
    )
  }

  const displayName = user.displayName ?? user.name ?? 'Customer'
  const contactLine = maskPhone(user.phone) || user.email || ''

  const accountItems: MenuItem[] = [
    { icon: '📦', label: 'Orders & Refunds', href: '/orders' },
    { icon: '📍', label: 'Addresses', onClick: () => setAddressesOpen((v) => !v) },
    { icon: '💳', label: 'Saved Payments', href: '/checkout' },
  ]

  const rewardsItems: MenuItem[] = [
    { icon: '🏷️', label: 'Coupons', href: '/checkout' },
    { icon: '🎁', label: 'Refer & Earn', onClick: () => setSupportOpen(true) },
  ]

  const helpItems: MenuItem[] = [
    { icon: '💬', label: 'Customer Support', onClick: () => setSupportOpen(true) },
    { icon: '📄', label: 'Terms & Conditions', href: '/auth' },
  ]

  return (
    <div className="mx-auto min-h-screen max-w-md border-x border-gray-100 bg-slate-50 pb-12 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-slate-100 bg-white px-4 py-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-lg font-bold text-gray-800 transition-colors hover:text-[#FF6B35]"
          aria-label="Go back"
        >
          ←
        </button>
        <h1 className="text-base font-bold tracking-tight text-slate-900">My Profile</h1>
      </div>

      {/* User card */}
      <div className="p-4">
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF5F2] text-xl font-bold text-[#FF6B35]">
              👤
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{displayName}</h2>
              {contactLine && (
                <p className="mt-0.5 text-xs text-slate-500">{contactLine}</p>
              )}
              {sandbox && (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  {roleLabel(user.role)} · Sandbox
                </p>
              )}
            </div>
          </div>
          <Link
            href="/auth?role=customer&redirect=/profile"
            className="rounded-lg bg-[#FFF5F2] px-3 py-1.5 text-xs font-bold tracking-wide text-[#FF6B35] transition-colors hover:bg-[#FFEAE2]"
          >
            EDIT
          </Link>
        </div>
      </div>

      {/* Addresses panel (toggle) */}
      {addressesOpen && (
        <div className="px-4 pb-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <GeoLocationPanel />
          </div>
        </div>
      )}

      {/* Menu sections */}
      <div className="flex flex-col gap-5 px-4">
        <MenuSection title="Your Account" items={accountItems} />
        <MenuSection title="Offers & Rewards" items={rewardsItems} />
        <MenuSection title="Help & Legal" items={helpItems} />

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="group flex w-full cursor-pointer items-center justify-between p-3.5 transition-colors hover:bg-[#FFF5F2]"
          >
            <div className="flex items-center gap-3.5">
              <span className="text-base text-gray-400 transition-colors group-hover:text-[#FF6B35]">
                🚪
              </span>
              <span className="text-sm font-bold text-slate-700 transition-colors group-hover:text-[#FF6B35]">
                Log Out
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400 transition-colors group-hover:text-[#FF6B35]">
              ❯
            </span>
          </button>
        </div>
      </div>

      {sandbox && (
        <div className="mt-8 px-4">
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

      {/* Footer */}
      <div className="mt-10 text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">rabbitor</p>
        <p className="mt-0.5 text-[9px] font-medium text-slate-400">v0.1.0</p>
      </div>

      <SupportChatDrawer open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  )
}
