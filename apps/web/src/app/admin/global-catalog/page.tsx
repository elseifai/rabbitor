'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RoleGate } from '@/components/auth/RoleGate'
import { AdminCatalogCommand } from '@/components/admin/AdminCatalogCommand'

export default function AdminGlobalCatalogPage() {
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
          <h1 className="text-2xl font-black text-gray-900">Global Master Catalog</h1>
          <p className="mt-1 text-sm text-gray-500">
            Zepto / Instamart-style template bank · velocity rankings · store assortment spread
          </p>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 sm:p-6">
          <AdminCatalogCommand />
        </main>
      </div>
    </RoleGate>
  )
}
