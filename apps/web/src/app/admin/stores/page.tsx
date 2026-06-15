'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RoleGate } from '@/components/auth/RoleGate'
import { AdminStoresOpsPanel } from '@/components/admin/AdminStoresOpsPanel'

export default function AdminStoresPage() {
  return (
    <RoleGate role="ADMIN" redirectTo="/admin/login">
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white px-4 py-4 sm:px-6">
          <Link
            href="/admin"
            className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-[#FF6B35]"
          >
            <ArrowLeft className="h-4 w-4" />
            Admin command center
          </Link>
          <h1 className="text-2xl font-black text-gray-900">Store Operations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Dark-store performance grid · handover telemetry · merchant controls
          </p>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 sm:p-6">
          <AdminStoresOpsPanel />
        </main>
      </div>
    </RoleGate>
  )
}
