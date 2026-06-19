'use server'

import {
  sendOtp,
  verifyOtp,
  sendEmailOtp,
  verifyEmailOtp,
  verifyEmailToken,
  getCurrentAuth,
  clearSession,
  getSession,
} from '@/lib/auth'

type Role = 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN'

export async function requestOtpAction(phone: string) {
  try {
    const result = await sendOtp(phone)
    return { ok: true as const, devCode: result.devCode }
  } catch (e) {
    return { ok: false as const, error: (e as Error).message }
  }
}

export async function requestEmailOtpAction(email: string, role?: Role) {
  try {
    const result = await sendEmailOtp(email, role)
    if (!result.success) {
      return { ok: false as const, error: result.error ?? 'Failed to send verification email.' }
    }
    return { ok: true as const, devCode: result.devCode }
  } catch (e) {
    return { ok: false as const, error: (e as Error).message }
  }
}

export async function verifyEmailOtpAction(email: string, code: string, role?: Role) {
  const result = await verifyEmailOtp(email, code, role)
  if (!result.success) return { ok: false as const, error: result.error }
  return { ok: true as const, token: result.token!, user: result.user! }
}

export async function verifyOtpAction(
  phone: string,
  code: string,
  role?: 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN',
) {
  const result = await verifyOtp(phone, code, role)
  if (!result.success) return { ok: false as const, error: result.error }
  return {
    ok: true as const,
    token: result.token!,
    user: result.user!,
  }
}

export async function verifyEmailTokenAction(token: string) {
  const result = await verifyEmailToken(token)
  if (!result.success) return { ok: false as const, error: result.error }
  return { ok: true as const, token: result.token!, user: result.user! }
}

export async function getCurrentUserAction() {
  return getCurrentAuth()
}

export async function logoutAction() {
  await clearSession()
  return { ok: true as const }
}

export async function getSessionAction() {
  return getSession()
}
