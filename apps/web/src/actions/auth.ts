'use server'

import { sendOtp, verifyOtp, clearSession, getSession } from '@/lib/auth'

export async function requestOtpAction(phone: string) {
  try {
    const result = await sendOtp(phone)
    return { ok: true as const, devCode: result.devCode }
  } catch (e) {
    return { ok: false as const, error: (e as Error).message }
  }
}

export async function verifyOtpAction(
  phone: string,
  code: string,
  role?: 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN',
) {
  const result = await verifyOtp(phone, code, role === 'ADMIN' ? undefined : role)
  if (!result.success) return { ok: false as const, error: result.error }
  return {
    ok: true as const,
    token: result.token!,
    user: result.user!,
  }
}

export async function logoutAction() {
  await clearSession()
  return { ok: true as const }
}

export async function getSessionAction() {
  return getSession()
}
