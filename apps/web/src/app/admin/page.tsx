'use client'

import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { RoleGate } from '@/components/auth/RoleGate'

export default function AdminPage() {
  return (
    <RoleGate role="ADMIN" redirectTo="/admin/login">
      <AdminDashboard />
    </RoleGate>
  )
}
