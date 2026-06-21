'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Smartphone,
  CreditCard,
  Banknote,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Building2,
  Wallet,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import {
  CARD_NETWORK_LABEL,
  detectCardNetwork,
  type CardNetwork,
} from '@/lib/card-network'
import { cn, formatCurrency } from '@/lib/utils'

const spring = { type: 'spring' as const, stiffness: 400, damping: 34 }
const ORANGE = '#FF6B35'

type PaymentChannel = 'upi' | 'card' | 'cod' | 'more'

type PaymentSheetDrawerProps = {
  open: boolean
  onClose: () => void
  grandTotal: number
  codEnabled: boolean
  onlineEnabled: boolean
  isPlacing: boolean
  onPayCod: () => void
  onPayUpiApp: (app: 'gpay' | 'phonepe' | 'paytm') => void
  onPayCard: () => void
  onPayNetbanking: () => void
  onPayBnpl: (provider: string) => void
}

const UPI_APPS = [
  {
    id: 'gpay' as const,
    label: 'Google Pay',
    short: 'GPay',
    mark: 'G',
    ring: 'ring-blue-500/40',
    markBg: 'bg-[#4285F4]',
  },
  {
    id: 'phonepe' as const,
    label: 'PhonePe',
    short: 'PhonePe',
    mark: 'Pe',
    ring: 'ring-[#5F259F]/40',
    markBg: 'bg-[#5F259F]',
  },
  {
    id: 'paytm' as const,
    label: 'Paytm',
    short: 'Paytm',
    mark: 'P',
    ring: 'ring-[#00BAF2]/40',
    markBg: 'bg-[#00BAF2]',
  },
]

const BNPL_PROVIDERS = ['Simpl', 'LazyPay', 'ZestMoney']

function NetworkBadge({ network }: { network: CardNetwork }) {
  const label = CARD_NETWORK_LABEL[network]
  if (!label) return null
  const colors: Record<CardNetwork, string> = {
    visa: 'bg-blue-600/20 text-blue-300 ring-blue-500/30',
    mastercard: 'bg-orange-500/20 text-orange-300 ring-orange-500/30',
    rupay: 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/30',
    amex: 'bg-zinc-500/20 text-zinc-300 ring-zinc-500/30',
    unknown: 'bg-zinc-800 text-zinc-400 ring-zinc-700',
  }
  return (
    <span
      className={cn(
        'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ring-1',
        colors[network],
      )}
    >
      {label}
    </span>
  )
}

function ChannelCard({
  children,
  expanded,
  className,
}: {
  children: React.ReactNode
  expanded?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border bg-[#161616] transition-colors',
        expanded
          ? 'border-[#FF6B35]/45 shadow-[0_0_0_1px_rgba(255,107,53,0.12)]'
          : 'border-[#2A2A2A] hover:border-[#3A3A3A]',
        className,
      )}
    >
      {children}
    </div>
  )
}

function IconTile({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF6B35]/15 text-[#FF6B35] ring-1 ring-[#FF6B35]/25',
        className,
      )}
    >
      {children}
    </span>
  )
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white',
        'bg-[#FF6B35] shadow-[0_8px_24px_rgba(255,107,53,0.35)]',
        'hover:bg-[#FF8555] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
      )}
    >
      {children}
    </motion.button>
  )
}

function SecondaryOptionButton({
  children,
  disabled,
  onClick,
  icon,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border border-[#2E2E2E] bg-[#121212] px-3.5 py-3 text-left',
        'transition hover:border-[#FF6B35]/30 hover:bg-[#1A1A1A] disabled:opacity-40',
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF6B35]/10 text-[#FF6B35]">
        {icon}
      </span>
      <span className="text-sm font-semibold text-white/90">{children}</span>
    </button>
  )
}

export function PaymentSheetDrawer({
  open,
  onClose,
  grandTotal,
  codEnabled,
  onlineEnabled,
  isPlacing,
  onPayCod,
  onPayUpiApp,
  onPayCard,
  onPayNetbanking,
  onPayBnpl,
}: PaymentSheetDrawerProps) {
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState<PaymentChannel | null>('upi')
  const [moreOpen, setMoreOpen] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [codAcknowledged, setCodAcknowledged] = useState(false)
  const cardNetwork = detectCardNetwork(cardNumber)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) {
      setExpanded('upi')
      setMoreOpen(false)
      setCodAcknowledged(false)
      setCardNumber('')
      setCardExpiry('')
      setCardCvv('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!mounted || !open) return null

  const toggle = (channel: PaymentChannel) => {
    setExpanded((prev) => (prev === channel ? null : channel))
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[220] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Close payment options"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !isPlacing && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-sheet-title"
            className={cn(
              'relative z-[221] flex max-h-[min(92dvh,640px)] w-full max-w-md flex-col overflow-hidden',
              'rounded-[1.75rem] border border-[#FF6B35]/20 bg-[#0A0A0A]',
              'shadow-[0_32px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,107,53,0.08)]',
            )}
            initial={{ y: 48, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0, scale: 0.98 }}
            transition={spring}
          >
            {/* Orange accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-[#FF6B35] via-[#FF8555] to-[#FF6B35]" />

            {/* Header */}
            <div className="relative border-b border-[#222] px-5 pb-4 pt-5">
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#FF6B35]/10 blur-2xl"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#FF6B35]/10 px-2.5 py-1 ring-1 ring-[#FF6B35]/25">
                    <Lock className="h-3 w-3 text-[#FF6B35]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF8555]">
                      Secure checkout
                    </span>
                  </div>
                  <h2 id="payment-sheet-title" className="text-lg font-bold text-white">
                    Choose payment method
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    Amount payable
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !isPlacing && onClose()}
                  disabled={isPlacing}
                  className="rounded-full border border-[#333] bg-[#141414] p-2 text-white/70 transition hover:border-[#FF6B35]/40 hover:text-white disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-end justify-between rounded-2xl border border-[#FF6B35]/25 bg-gradient-to-br from-[#FF6B35]/15 to-[#141414] px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#FF8555]/80">
                    Order total
                  </p>
                  <p className="text-2xl font-black tabular-nums text-white">
                    {formatCurrency(grandTotal)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/45">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#FF6B35]" />
                  Razorpay secured
                </div>
              </div>
            </div>

            {/* Scrollable channels */}
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4 scrollbar-hide">
              {/* UPI */}
              <ChannelCard expanded={expanded === 'upi'}>
                <button
                  type="button"
                  onClick={() => toggle('upi')}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <IconTile>
                      <Smartphone className="h-5 w-5" strokeWidth={2.25} />
                    </IconTile>
                    <div>
                      <p className="text-sm font-bold text-white">UPI · Instant pay</p>
                      <p className="text-[11px] text-white/45">Google Pay, PhonePe, Paytm</p>
                    </div>
                  </div>
                  {expanded === 'upi' ? (
                    <ChevronUp className="h-4 w-4 text-[#FF6B35]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-white/35" />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {expanded === 'upi' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 border-t border-[#222] px-4 pb-4 pt-3">
                        <div className="grid grid-cols-3 gap-2">
                          {UPI_APPS.map((app) => (
                            <motion.button
                              key={app.id}
                              type="button"
                              disabled={!onlineEnabled || isPlacing}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => onPayUpiApp(app.id)}
                              className={cn(
                                'flex flex-col items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#111] p-3',
                                'transition hover:border-[#FF6B35]/35 hover:bg-[#161616]',
                                'disabled:cursor-not-allowed disabled:opacity-40',
                                app.ring,
                              )}
                            >
                              <span
                                className={cn(
                                  'flex h-9 w-9 items-center justify-center rounded-full text-xs font-black text-white',
                                  app.markBg,
                                )}
                              >
                                {app.mark}
                              </span>
                              <span className="text-[10px] font-semibold text-white/80">
                                {app.short}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                        {!onlineEnabled && (
                          <p className="text-center text-[10px] font-medium text-[#FF8555]/90">
                            Online UPI unavailable — try Cash on Delivery
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ChannelCard>

              {/* Card */}
              <ChannelCard expanded={expanded === 'card'}>
                <button
                  type="button"
                  onClick={() => toggle('card')}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <IconTile>
                      <CreditCard className="h-5 w-5" strokeWidth={2.25} />
                    </IconTile>
                    <div>
                      <p className="text-sm font-bold text-white">Debit / Credit card</p>
                      <p className="text-[11px] text-white/45">Visa · Mastercard · RuPay</p>
                    </div>
                  </div>
                  <NetworkBadge network={cardNetwork} />
                </button>
                <AnimatePresence initial={false}>
                  {expanded === 'card' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2.5 border-t border-[#222] px-4 pb-4 pt-3">
                        <input
                          value={cardNumber}
                          onChange={(e) =>
                            setCardNumber(
                              e.target.value
                                .replace(/\D/g, '')
                                .slice(0, 19)
                                .replace(/(.{4})/g, '$1 ')
                                .trim(),
                            )
                          }
                          placeholder="Card number"
                          inputMode="numeric"
                          className="w-full rounded-xl border border-[#333] bg-[#111] px-3 py-2.5 text-sm font-medium tracking-wider text-white placeholder:text-white/30 focus:border-[#FF6B35]/50 focus:outline-none focus:ring-1 focus:ring-[#FF6B35]/30"
                        />
                        <div className="flex gap-2">
                          <input
                            value={cardExpiry}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                              setCardExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v)
                            }}
                            placeholder="MM/YY"
                            className="w-1/2 rounded-xl border border-[#333] bg-[#111] px-3 py-2.5 text-sm font-medium text-white placeholder:text-white/30 focus:border-[#FF6B35]/50 focus:outline-none focus:ring-1 focus:ring-[#FF6B35]/30"
                          />
                          <input
                            value={cardCvv}
                            onChange={(e) =>
                              setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))
                            }
                            placeholder="CVV"
                            type="password"
                            className="w-1/2 rounded-xl border border-[#333] bg-[#111] px-3 py-2.5 text-sm font-medium text-white placeholder:text-white/30 focus:border-[#FF6B35]/50 focus:outline-none focus:ring-1 focus:ring-[#FF6B35]/30"
                          />
                        </div>
                        <PrimaryButton
                          disabled={
                            !onlineEnabled ||
                            isPlacing ||
                            cardNumber.replace(/\s/g, '').length < 12 ||
                            cardExpiry.length < 4 ||
                            cardCvv.length < 3
                          }
                          onClick={onPayCard}
                        >
                          {isPlacing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Processing…
                            </>
                          ) : (
                            <>Pay {formatCurrency(grandTotal)}</>
                          )}
                        </PrimaryButton>
                        <p className="text-center text-[9px] leading-relaxed text-white/35">
                          Card details are processed via Razorpay PCI-DSS — never stored on Rabbit
                          servers.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ChannelCard>

              {/* COD */}
              {codEnabled && (
                <ChannelCard expanded={expanded === 'cod'}>
                  <button
                    type="button"
                    onClick={() => toggle('cod')}
                    className="flex w-full items-center justify-between px-4 py-3.5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <IconTile>
                        <Banknote className="h-5 w-5" strokeWidth={2.25} />
                      </IconTile>
                      <div>
                        <p className="text-sm font-bold text-white">Cash on delivery</p>
                        <p className="text-[11px] text-white/45">Pay when your order arrives</p>
                      </div>
                    </div>
                    {expanded === 'cod' ? (
                      <ChevronUp className="h-4 w-4 text-[#FF6B35]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-white/35" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {expanded === 'cod' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 border-t border-[#222] px-4 pb-4 pt-3">
                          <div className="flex gap-2.5 rounded-xl border border-[#FF6B35]/20 bg-[#FF6B35]/5 p-3">
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#FF8555]" />
                            <p className="text-[10px] leading-relaxed text-white/55">
                              COD orders may require OTP verification or address re-confirmation for
                              high-value baskets.
                            </p>
                          </div>
                          <label className="flex cursor-pointer items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={codAcknowledged}
                              onChange={(e) => setCodAcknowledged(e.target.checked)}
                              className="mt-0.5 h-4 w-4 rounded border-[#444] bg-[#111] accent-[#FF6B35]"
                            />
                            <span className="text-[11px] leading-relaxed text-white/55">
                              I understand COD is subject to fraud checks and may be declined for
                              repeat cancellations.
                            </span>
                          </label>
                          <PrimaryButton disabled={!codAcknowledged || isPlacing} onClick={onPayCod}>
                            {isPlacing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Placing order…
                              </>
                            ) : (
                              <>Confirm COD · {formatCurrency(grandTotal)}</>
                            )}
                          </PrimaryButton>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </ChannelCard>
              )}

              {/* More options */}
              <ChannelCard expanded={moreOpen}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <IconTile className="bg-white/5 text-white/70 ring-white/10">
                      <Wallet className="h-5 w-5" strokeWidth={2.25} />
                    </IconTile>
                    <p className="text-sm font-bold text-white">More options</p>
                  </div>
                  {moreOpen ? (
                    <ChevronUp className="h-4 w-4 text-[#FF6B35]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-white/35" />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {moreOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 border-t border-[#222] px-4 pb-4 pt-3">
                        <SecondaryOptionButton
                          disabled={!onlineEnabled || isPlacing}
                          onClick={onPayNetbanking}
                          icon={<Building2 className="h-4 w-4" />}
                        >
                          Netbanking
                        </SecondaryOptionButton>
                        {BNPL_PROVIDERS.map((provider) => (
                          <SecondaryOptionButton
                            key={provider}
                            disabled={!onlineEnabled || isPlacing}
                            onClick={() => onPayBnpl(provider)}
                            icon={<Wallet className="h-4 w-4" />}
                          >
                            {provider} · Pay later
                          </SecondaryOptionButton>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ChannelCard>
            </div>

            {/* Footer trust strip */}
            <div className="border-t border-[#222] px-5 py-3">
              <p className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-white/35">
                <Lock className="h-3 w-3" style={{ color: ORANGE }} />
                256-bit encrypted · Powered by Razorpay
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
