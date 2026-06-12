'use client'

import { Loader2 } from 'lucide-react'
import {
  DEV_LOGIN_ACCOUNTS,
  type DevLoginAccount,
  type DevRoleId,
  isDevSandboxClient,
} from '@/lib/dev-auth'
import { useDevQuickLogin } from '@/hooks/useDevQuickLogin'
import type { SessionUser } from '@/lib/session'

type DevRoleLoginPanelProps = {
  mode?: 'page' | 'inline' | 'checkout'
  /** Highlight a role card (e.g. customer on checkout). */
  highlightRole?: DevRoleId
  redirectOnSuccess?: boolean
  onSuccess?: (user: SessionUser) => void
  resolveRedirect?: (account: DevLoginAccount, user: SessionUser) => string
}

const MODE_STYLES = {
  page: {
    shell: 'mx-auto w-full max-w-lg px-4 py-10',
    grid: 'mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2',
    card: 'flex min-h-[148px] flex-col items-start justify-between rounded-2xl border-2 p-5 text-left shadow-sm transition active:scale-[0.98]',
  },
  inline: {
    shell: 'w-full rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/90 p-5',
    grid: 'mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2',
    card: 'flex min-h-[120px] flex-col items-start justify-between rounded-xl border border-amber-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.98]',
  },
  checkout: {
    shell: 'mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10',
    grid: 'mt-6 grid grid-cols-1 gap-3',
    card: 'flex items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]',
  },
} as const

const ROLE_ACCENT: Record<DevRoleId, string> = {
  customer: 'border-orange-200 hover:border-[#FF6B35] hover:bg-orange-50/50',
  merchant: 'border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50/50',
  rabbitor: 'border-sky-200 hover:border-sky-500 hover:bg-sky-50/50',
  admin: 'border-violet-200 hover:border-violet-500 hover:bg-violet-50/50',
}

const HIGHLIGHT_RING: Record<DevRoleId, string> = {
  customer: 'ring-2 ring-[#FF6B35] ring-offset-2',
  merchant: 'ring-2 ring-emerald-500 ring-offset-2',
  rabbitor: 'ring-2 ring-sky-500 ring-offset-2',
  admin: 'ring-2 ring-violet-500 ring-offset-2',
}

function RoleCard({
  account,
  loading,
  disabled,
  mode,
  highlighted,
  onSelect,
}: {
  account: DevLoginAccount
  loading: boolean
  disabled: boolean
  mode: keyof typeof MODE_STYLES
  highlighted: boolean
  onSelect: (account: DevLoginAccount) => void
}) {
  const styles = MODE_STYLES[mode]

  if (mode === 'checkout') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(account)}
        className={`${styles.card} ${ROLE_ACCENT[account.id]} ${
          highlighted ? HIGHLIGHT_RING[account.id] : ''
        } disabled:opacity-50`}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
          {account.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900">{account.title}</p>
          <p className="text-xs text-slate-500">{account.subtitle}</p>
        </div>
        {loading ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#FF6B35]" />
        ) : (
          <span className="text-xs font-bold text-[#FF6B35]">Quick login →</span>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(account)}
      className={`${styles.card} ${ROLE_ACCENT[account.id]} ${
        highlighted ? HIGHLIGHT_RING[account.id] : ''
      } disabled:opacity-50`}
    >
      <span className="text-3xl">{account.emoji}</span>
      <div>
        <p className="text-base font-black text-slate-900">{account.title}</p>
        <p className="mt-1 text-xs leading-snug text-slate-500">{account.subtitle}</p>
      </div>
      <span className="mt-3 flex items-center gap-1 text-xs font-bold text-[#FF6B35]">
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Signing in…
          </>
        ) : (
          <>⚡ Quick login</>
        )}
      </span>
    </button>
  )
}

/** DEV ONLY BYPASS — multi-role sandbox login panel (page, inline, or checkout gate). */
export function DevRoleLoginPanel({
  mode = 'page',
  highlightRole,
  redirectOnSuccess = true,
  onSuccess,
  resolveRedirect,
}: DevRoleLoginPanelProps) {
  const { quickLogin, loadingId, error } = useDevQuickLogin({
    redirectOnSuccess,
    onSuccess,
    resolveRedirect,
  })

  if (!isDevSandboxClient()) return null

  const styles = MODE_STYLES[mode]
  const title =
    mode === 'checkout'
      ? 'Sign in to continue checkout'
      : 'Select your interface'
  const subtitle =
    mode === 'checkout'
      ? 'Choose a test role — you’ll return to payment right after login.'
      : 'Dev sandbox — one-tap login with seeded accounts (OTP 123456).'

  return (
    <section className={styles.shell} aria-label="Developer role quick login">
      <div className="text-center sm:text-left">
        {mode !== 'inline' && (
          <div className="mb-3 inline-flex items-center gap-2">
            <span className="rounded-md bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-900">
              Dev sandbox
            </span>
          </div>
        )}
        <h1
          className={
            mode === 'page'
              ? 'font-display text-2xl font-black text-slate-900'
              : 'text-lg font-black text-slate-900'
          }
        >
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className={styles.grid}>
        {DEV_LOGIN_ACCOUNTS.map((account) => (
          <RoleCard
            key={account.id}
            account={account}
            mode={mode}
            highlighted={highlightRole === account.id}
            loading={loadingId === account.id}
            disabled={loadingId !== null}
            onSelect={(a) => void quickLogin(a)}
          />
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {mode === 'page' && (
        <p className="mt-8 text-center text-[11px] text-slate-400">
          DEV ONLY BYPASS — remove before production SMS / Google OAuth go live.
        </p>
      )}
    </section>
  )
}
