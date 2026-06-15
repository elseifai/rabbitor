'use client'

import { useCallback, useEffect, useState } from 'react'
import { Battery, Loader2, Plus, Radio, RefreshCw, Wallet, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

type RiderRow = {
  id: string
  name: string
  phone: string
  attendance: 'ONLINE' | 'OFFLINE' | 'BREAK'
  activeOrders: number
  acceptanceRate: number
  batteryHealth: number
  networkHealth: string
  bankName: string | null
}

export function AdminRidersOpsPanel() {
  const [riders, setRiders] = useState<RiderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [phone, setPhone] = useState('')
  const [adding, setAdding] = useState(false)
  const [assignRider, setAssignRider] = useState<RiderRow | null>(null)
  const [orderId, setOrderId] = useState('')
  const [payoutRider, setPayoutRider] = useState<RiderRow | null>(null)
  const [payoutAmount, setPayoutAmount] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/riders')
      const json = await res.json()
      if (json.success) setRiders(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const interval = setInterval(() => void load(), 30000)
    return () => clearInterval(interval)
  }, [load])

  const runAction = async (
    riderId: string,
    body: Record<string, unknown>,
  ) => {
    setActing(riderId)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/riders/${riderId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Action failed')
      setMessage(json.message ?? 'Done')
      void load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setActing(null)
    }
  }

  const addRider = async () => {
    setAdding(true)
    try {
      const res = await fetch('/api/admin/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const json = await res.json()
      if (json.success) {
        setShowAdd(false)
        setPhone('')
        void load()
      } else {
        setMessage(json.error)
      }
    } finally {
      setAdding(false)
    }
  }

  const attendanceColor = (a: RiderRow['attendance']) => {
    if (a === 'ONLINE') return 'bg-green-100 text-[#0C831F]'
    if (a === 'BREAK') return 'bg-amber-100 text-amber-700'
    return 'bg-gray-100 text-gray-500'
  }

  if (loading && riders.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 rounded-xl bg-[#FF6B35] px-4 py-2 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Add Rider
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold text-gray-600"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {message && (
        <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</p>
      )}

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-white">
            <tr>
              <th className="px-4 py-3">Rider</th>
              <th className="px-4 py-3">Attendance</th>
              <th className="px-4 py-3">Active batch</th>
              <th className="px-4 py-3">Accept %</th>
              <th className="px-4 py-3">Health</th>
              <th className="px-4 py-3">Overrides</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {riders.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50/30">
                <td className="px-4 py-3">
                  <p className="font-bold">{r.name}</p>
                  <p className="font-mono text-xs text-gray-400">{r.phone}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('rounded px-2 py-0.5 text-[10px] font-black', attendanceColor(r.attendance))}>
                    {r.attendance}
                  </span>
                </td>
                <td className="px-4 py-3 font-black text-orange-600">{r.activeOrders}</td>
                <td className="px-4 py-3 font-bold">{r.acceptanceRate}%</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Battery className="h-3.5 w-3.5" />
                      {r.batteryHealth}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Radio className="h-3.5 w-3.5" />
                      {r.networkHealth}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => setAssignRider(r)}
                      className="rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white"
                    >
                      Force assign
                    </button>
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() =>
                        void runAction(r.id, { action: 'resetJobCache' })
                      }
                      className="rounded-lg border px-2 py-1 text-[10px] font-bold"
                    >
                      Reset cache
                    </button>
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => setPayoutRider(r)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#0C831F] px-2 py-1 text-[10px] font-bold text-white"
                    >
                      <Wallet className="h-3 w-3" />
                      Payout
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <ModalShell title="Add rider" onClose={() => setShowAdd(false)}>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit phone"
            className="mb-3 w-full rounded-xl border px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={adding || phone.length < 10}
            onClick={() => void addRider()}
            className="w-full rounded-xl bg-[#0C831F] py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Add Rider'}
          </button>
        </ModalShell>
      )}

      {assignRider && (
        <ModalShell title="Force assign order" onClose={() => setAssignRider(null)}>
          <p className="mb-2 text-sm text-gray-500">Assign active leg to {assignRider.name}</p>
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Order ID"
            className="mb-3 w-full rounded-xl border px-3 py-2 text-sm font-mono"
          />
          <button
            type="button"
            disabled={!orderId || acting === assignRider.id}
            onClick={() => {
              void runAction(assignRider.id, { action: 'forceAssign', orderId }).then(() => {
                setAssignRider(null)
                setOrderId('')
              })
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            Assign now
          </button>
        </ModalShell>
      )}

      {payoutRider && (
        <ModalShell title="Manual wallet payout" onClose={() => setPayoutRider(null)}>
          <p className="mb-2 text-sm text-gray-500">
            {payoutRider.bankName ? `Bank: ${payoutRider.bankName}` : 'Bank details on file required'}
          </p>
          <input
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
            placeholder="Amount (₹)"
            type="number"
            className="mb-3 w-full rounded-xl border px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!payoutAmount || acting === payoutRider.id}
            onClick={() => {
              void runAction(payoutRider.id, {
                action: 'manualPayout',
                amount: Number(payoutAmount),
              }).then(() => {
                setPayoutRider(null)
                setPayoutAmount('')
              })
            }}
            className="w-full rounded-xl bg-[#0C831F] py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            Queue payout
          </button>
        </ModalShell>
      )}
    </div>
  )
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
