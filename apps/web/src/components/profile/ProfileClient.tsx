'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Gift,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Rabbit,
  Sparkles,
  Tag,
  type LucideIcon,
} from 'lucide-react'
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
  icon: LucideIcon
  label: string
  subtitle: string
  href?: string
  onClick?: () => void
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

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'R'
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase()
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase()
}

function QuickAction({
  icon: Icon,
  tone,
  title,
  subtitle,
  href,
  onClick,
}: {
  icon: LucideIcon
  tone: 'orange' | 'green'
  title: string
  subtitle: string
  href?: string
  onClick?: () => void
}) {
  const toneClasses =
    tone === 'orange' ? 'bg-[#FFF4EE] text-[#FF6A3D]' : 'bg-[#F2FAF4] text-[#2FAF5A]'

  const content = (
    <motion.div
      whileTap={{ scale: 0.96 }}
      className="flex h-full flex-col gap-2 rounded-[18px] bg-white p-3.5 shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
    >
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', toneClasses)}>
        <Icon size={18} strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-[#1E1E1E]">{title}</p>
        <p className="truncate text-[11px] text-[#7A7A7A]">{subtitle}</p>
      </div>
    </motion.div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {content}
    </button>
  )
}

function MenuSection({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <div>
      <h3 className="mb-2.5 pl-1 text-[13px] font-semibold uppercase tracking-wide text-[#7A7A7A]">
        {title}
      </h3>
      <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        {items.map((item, idx) => {
          const tone = idx % 2 === 0 ? 'orange' : 'green'
          const toneClasses =
            tone === 'orange' ? 'bg-[#FFF4EE] text-[#FF6A3D]' : 'bg-[#F2FAF4] text-[#2FAF5A]'
          const Icon = item.icon

          const rowClass = cn(
            'flex min-h-[72px] w-full cursor-pointer items-center gap-3.5 px-4 py-3 text-left transition-colors active:bg-[#F8FAFC]',
            idx !== items.length - 1 && 'border-b border-[#EEF1F4]',
          )

          const inner = (
            <>
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneClasses)}>
                <Icon size={19} strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-medium text-[#1E1E1E]">{item.label}</p>
                <p className="truncate text-[13px] text-[#7A7A7A]">{item.subtitle}</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-[#7A7A7A]" />
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
            <button key={item.label} type="button" onClick={item.onClick} className={rowClass}>
              {inner}
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
        <div className="mx-auto min-h-screen max-w-md border-x border-gray-100 bg-[#F8FAFC] px-4 py-6">
          <DevRoleLoginPanel
            mode="page"
            redirectOnSuccess={false}
            onSuccess={() => router.refresh()}
          />
        </div>
      )
    }

    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center border-x border-gray-100 bg-[#F8FAFC] px-4 py-20 text-sm font-medium text-[#7A7A7A]">
        {redirecting ? 'Opening sign in…' : 'Loading profile…'}
      </div>
    )
  }

  const displayName = user.displayName ?? user.name ?? 'Customer'
  const contactLine = maskPhone(user.phone)

  const accountItems: MenuItem[] = [
    { icon: CreditCard, label: 'Saved Payments', subtitle: 'Cards & UPI', href: '/checkout' },
    { icon: Tag, label: 'Coupons', subtitle: 'Offers you can use', href: '/checkout' },
    { icon: Gift, label: 'Refer & Earn', subtitle: 'Invite friends & earn', onClick: () => setSupportOpen(true) },
  ]

  const helpItems: MenuItem[] = [
    { icon: MessageCircle, label: 'Customer Support', subtitle: 'Chat with our team', onClick: () => setSupportOpen(true) },
    { icon: FileText, label: 'Terms & Conditions', subtitle: 'Legal & policies', href: '/auth' },
    { icon: LogOut, label: 'Log Out', subtitle: 'Sign out of your account', onClick: () => void handleLogout() },
  ]

  return (
    <div className="mx-auto min-h-screen max-w-md border-x border-gray-100 bg-[#F8FAFC] pb-12 font-sans">
      {/* App bar */}
      <div className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-[#EEF1F4] bg-white px-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#1E1E1E] transition-colors hover:bg-[#F8FAFC]"
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={2.25} />
        </button>
        <h1 className="text-[22px] font-semibold tracking-tight text-[#1E1E1E]">My Profile</h1>
      </div>

      <div className="flex flex-col gap-6 px-5 pt-5">
        {/* Profile card */}
        <motion.div
          whileTap={{ scale: 0.995 }}
          className="relative overflow-hidden rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F2FAF4] via-white to-white" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#F2FAF4] text-xl font-bold text-[#2FAF5A]">
              {initialsFor(displayName)}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className="truncate text-[20px] font-bold text-[#1E1E1E]">{displayName}</h2>
              {contactLine && (
                <p className="mt-1 text-[15px] font-medium text-[#1E1E1E]/80">{contactLine}</p>
              )}
              {user.email && (
                <p className="mt-0.5 truncate text-[14px] text-[#7A7A7A]">{user.email}</p>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F2FAF4] px-2.5 py-1 text-[11px] font-semibold text-[#2FAF5A]">
                  <Sparkles size={12} strokeWidth={2.5} />
                  Rabbit Member
                </span>
                {sandbox && (
                  <span className="inline-flex items-center rounded-full bg-[#FFF4EE] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#FF6A3D]">
                    {roleLabel(user.role)} · Sandbox
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/auth?role=customer&redirect=/profile"
              aria-label="Edit profile"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF4EE] text-[#FF6A3D] transition-transform active:scale-95"
            >
              <Pencil size={18} strokeWidth={2.25} />
            </Link>
          </div>
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          <QuickAction
            icon={Package}
            tone="orange"
            title="Orders"
            subtitle="View all orders"
            href="/orders"
          />
          <QuickAction
            icon={MapPin}
            tone="green"
            title="Addresses"
            subtitle="Manage addresses"
            onClick={() => setAddressesOpen((v) => !v)}
          />
          <QuickAction
            icon={CreditCard}
            tone="orange"
            title="Payments"
            subtitle="Cards & UPI"
            href="/checkout"
          />
        </div>

        {/* Addresses panel (toggle) */}
        {addressesOpen && (
          <div className="rounded-[22px] bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
            <GeoLocationPanel />
          </div>
        )}

        {/* Menu sections */}
        <MenuSection title="Offers & Account" items={accountItems} />
        <MenuSection title="Help & Legal" items={helpItems} />

        {/* Promotional card */}
        <div className="relative flex h-[110px] items-center justify-between overflow-hidden rounded-[24px] bg-gradient-to-r from-[#F2FAF4] to-[#E3F5E9] px-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[#2FAF5A]">
              <Rabbit size={26} strokeWidth={2} />
            </span>
            <div className="max-w-[130px]">
              <p className="text-[14px] font-semibold text-[#1E1E1E]">Get Free Delivery</p>
              <p className="mt-0.5 text-[12px] leading-tight text-[#7A7A7A]">
                Shop ₹99 more to unlock free delivery
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-full bg-[#FF6A3D] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-transform active:scale-95"
          >
            Shop Now
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]/60">rabbitor</p>
        <p className="mt-0.5 text-[9px] font-medium text-[#7A7A7A]/50">v0.1.0</p>
      </div>

      <SupportChatDrawer open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  )
}
