import type { SessionUser } from '@/lib/session'
import type { AuthRoleId } from '@/lib/auth-roles'

export const AUTH_PUBLIC_PREFIXES = [
  '/auth',
  '/login',
  '/api',
  '/manifest.webmanifest',
] as const

export const AUTH_OPTIONAL_PREFIXES = [
  '/',
  '/shops',
  '/shop',
  '/product',
  '/search',
  '/cart',
] as const

export const AUTH_PROTECTED_PREFIXES = [
  '/checkout',
  '/profile',
  '/orders',
  '/track',
  '/merchant',
  '/admin',
  '/delivery',
  '/rabbitor',
  '/dashboard',
] as const

export function isPublicAuthPath(pathname: string): boolean {
  return AUTH_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function isProtectedAuthPath(pathname: string): boolean {
  return AUTH_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function loginPathForRole(roleId: AuthRoleId, redirect?: string): string {
  const params = new URLSearchParams()
  params.set('role', roleId)
  if (redirect) params.set('redirect', redirect)
  return `/auth?${params.toString()}`
}

export function defaultDashboardForRole(role: SessionUser['role']): string {
  switch (role) {
    case 'VENDOR':
      return '/merchant'
    case 'RABBITOR':
      return '/delivery'
    case 'ADMIN':
      return '/admin'
    default:
      return '/'
  }
}

export function onboardingPathForRole(role: SessionUser['role']): string | null {
  switch (role) {
    case 'VENDOR':
      return '/merchant/onboarding'
    case 'RABBITOR':
      return '/delivery/login?setup=1'
    default:
      return null
  }
}
