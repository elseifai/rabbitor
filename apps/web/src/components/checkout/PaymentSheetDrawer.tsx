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
} from 'lucide-react'
import {
  CARD_NETWORK_LABEL,
  detectCardNetwork,
  type CardNetwork,
} from '@/lib/card-network'
import { cn, formatCurrency } from '@/lib/utils'

const spring = { type: 'spring' as const, stiffness: 380, damping: 32 }

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
  { id: 'gpay' as const, label: 'Google Pay', emoji: '🔵', bg: 'from-blue-500 to-blue-600' },
  { id: 'phonepe' as const, label: 'PhonePe', emoji: '🟣', bg: 'from-violet-600 to-purple-700' },
  { id: 'paytm' as const, label: 'Paytm', emoji: '🔷', bg: 'from-cyan-500 to-blue-600' },
]

const BNPL_PROVIDERS = ['Simpl', 'LazyPay', 'ZestMoney']

function NetworkBadge({ network }: { network: CardNetwork }) {
  const label = CARD_NETWORK_LABEL[network]
  if (!label) return null
  const colors: Record<CardNetwork, string> = {
    visa: 'bg-blue-700 text-white',
    mastercard: 'bg-orange-600 text-white',
    rupay: 'bg-indigo-700 text-white',
    amex: 'bg-slate-800 text-white',
    unknown: 'bg-slate-200 text-slate-600',
  }
  return (
    <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-black uppercase', colors[network])}>
      {label}
    </span>
  )
}

function GlassCard({
  children,
  className,
  accent,
}: {
  children: React.ReactNode
  className?: string
  accent?: string
}) {
  return (
    <motion.div
      whileHover={{ y: -3, rotateX: 2, scale: 1.01 }}
      transition={spring}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/40 p-4',
        'bg-white/70 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/50 before:to-transparent',
        accent,
        className,
      )}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
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
          className="fixed inset-0 z-[220] flex items-end justify-center sm:items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Close payment options"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
            onClick={() => !isPlacing && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-sheet-title"
            className="relative z-[221] w-full max-w-xl overflow-hidden rounded-t-[2rem] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
          >
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-white/20" />

            <div className="flex items-start justify-between px-5 pb-2 pt-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400">
                  Secure checkout
                </p>
                <h2 id="payment-sheet-title" className="mt-1 text-xl font-black text-white">
                  Choose how to pay
                </h2>
                <p className="mt-1 text-sm font-semibold text-white/60">
                  Total · {formatCurrency(grandTotal)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isPlacing && onClose()}
                disabled={isPlacing}
                className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto px-4 pb-6 pt-2">
              {/* CHANNEL 1 — UPI */}
              <GlassCard accent="ring-1 ring-blue-400/20">
                <button
                  type="button"
                  onClick={() => toggle('upi')}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                      <Smartphone className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-slate-900">Instant UPI</p>
                      <p className="text-[11px] font-semibold text-slate-500">GPay · PhonePe · Paytm</p>
                    </div>
                  </div>
                  {expanded === 'upi' ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </button>
                <AnimatePresence>
                  {expanded === 'upi' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 flex gap-2">
                        {UPI_APPS.map((app) => (
                          <motion.button
                            key={app.id}
                            type="button"
                            disabled={!onlineEnabled || isPlacing}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => onPayUpiApp(app.id)}
                            className={cn(
                              'flex flex-1 flex-col items-center gap-1.5 rounded-xl bg-gradient-to-br p-3 text-white shadow-lg',
                              app.bg,
                              'disabled:opacity-40',
                            )}
                          >
                            <span className="text-2xl">{app.emoji}</span>
                            <span className="text-[10px] font-black">{app.label}</span>
                          </motion.button>
                        ))}
                      </div>
                      {!onlineEnabled && (
                        <p className="mt-2 text-center text-[10px] font-semibold text-amber-600">
                          Online UPI unavailable — try COD below
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>

              {/* CHANNEL 2 — Cards */}
              <GlassCard accent="ring-1 ring-violet-400/20">
                <button
                  type="button"
                  onClick={() => toggle('card')}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg">
                      <CreditCard className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-slate-900">Credit / Debit card</p>
                      <p className="text-[11px] font-semibold text-slate-500">Visa · Mastercard · RuPay</p>
                    </div>
                  </div>
                  <NetworkBadge network={cardNetwork} />
                </button>
                <AnimatePresence>
                  {expanded === 'card' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 space-y-2 overflow-hidden"
                    >
                      <input
                        value={cardNumber}
                        onChange={(e) =>
                          setCardNumber(
                            e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim(),
                          )
                        }
                        placeholder="Card number"
                        inputMode="numeric"
                        className="w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm font-semibold tracking-wider"
                      />
                      <div className="flex gap-2">
                        <input
                          value={cardExpiry}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                            setCardExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v)
                          }}
                          placeholder="MM/YY"
                          className="w-1/2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm font-semibold"
                        />
                        <input
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="CVV"
                          type="password"
                          className="w-1/2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm font-semibold"
                        />
                      </div>
                      <motion.button
                        type="button"
                        disabled={
                          !onlineEnabled ||
                          isPlacing ||
                          cardNumber.replace(/\s/g, '').length < 12 ||
                          cardExpiry.length < 4 ||
                          cardCvv.length < 3
                        }
                        whileTap={{ scale: 0.98 }}
                        onClick={onPayCard}
                        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-black text-white shadow-lg disabled:opacity-40"
                      >
                        {isPlacing ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                          </span>
                        ) : (
                          `Pay ${formatCurrency(grandTotal)} securely`
                        )}
                      </motion.button>
                      <p className="text-center text-[9px] font-medium text-slate-400">
                        Card details are processed via Razorpay PCI-DSS vault — never stored on Rabbit servers.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>

              {/* CHANNEL 3 — COD */}
              {codEnabled && (
                <GlassCard accent="ring-1 ring-emerald-400/20">
                  <button
                    type="button"
                    onClick={() => toggle('cod')}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-lg">
                        <Banknote className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-slate-900">Cash on delivery</p>
                        <p className="text-[11px] font-semibold text-slate-500">Pay when order arrives</p>
                      </div>
                    </div>
                    {expanded === 'cod' ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                  <AnimatePresence>
                    {expanded === 'cod' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 overflow-hidden"
                      >
                        <div className="flex gap-2 rounded-xl border border-amber-200/80 bg-amber-50/90 p-3">
                          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <p className="text-[10px] font-semibold leading-relaxed text-amber-900">
                            Anti-fraud validation applies to COD orders. High-value baskets may require OTP
                            verification, address re-confirmation, or platform review before dispatch.
                          </p>
                        </div>
                        <label className="mt-3 flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={codAcknowledged}
                            onChange={(e) => setCodAcknowledged(e.target.checked)}
                            className="mt-0.5 rounded border-slate-300"
                          />
                          <span className="text-[11px] font-semibold text-slate-600">
                            I understand COD is subject to automated fraud checks and may be declined for
                            repeat cancellations.
                          </span>
                        </label>
                        <motion.button
                          type="button"
                          disabled={!codAcknowledged || isPlacing}
                          whileTap={{ scale: 0.98 }}
                          onClick={onPayCod}
                          className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 py-3 text-sm font-black text-white shadow-lg disabled:opacity-40"
                        >
                          {isPlacing ? 'Placing order…' : `Confirm COD · ${formatCurrency(grandTotal)}`}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              )}

              {/* MORE OPTIONS */}
              <GlassCard>
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-lg">
                      <Wallet className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-black text-slate-900">More options</p>
                  </div>
                  {moreOpen ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </button>
                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 space-y-2 overflow-hidden"
                    >
                      <button
                        type="button"
                        disabled={!onlineEnabled || isPlacing}
                        onClick={onPayNetbanking}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3 text-left disabled:opacity-40"
                      >
                        <Building2 className="h-5 w-5 text-slate-600" />
                        <span className="text-sm font-bold text-slate-800">Netbanking</span>
                      </button>
                      {BNPL_PROVIDERS.map((provider) => (
                        <button
                          key={provider}
                          type="button"
                          disabled={!onlineEnabled || isPlacing}
                          onClick={() => onPayBnpl(provider)}
                          className="flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3 text-left disabled:opacity-40"
                        >
                          <Wallet className="h-5 w-5 text-violet-600" />
                          <span className="text-sm font-bold text-slate-800">{provider} · Pay later</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
