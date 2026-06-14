import type { SessionUser } from '@/lib/session'
import type { AuthRoleId } from '@/lib/auth-roles'
import { parseAuthRoleParam } from '@/lib/auth-roles'

export const AUTH_PUBLIC_PREFIXES = [
  '/auth',
  '/login',
  '/api',
  '/manifest.webmanifest',
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

export function roleHintFromPathname(pathname: string): AuthRoleId {
  if (pathname.startsWith('/merchant')) return 'merchant'
  if (
    pathname.startsWith('/delivery') ||
    pathname.startsWith('/rabbitor')
  ) {
    return 'rabbitor'
  }
  if (pathname.startsWith('/admin')) return 'admin'
  return parseAuthRoleParam(null)
}

/** Required DB role for privileged route prefixes — null means any authenticated user. */
export function requiredRoleForPath(pathname: string): SessionUser['role'] | null {
  if (pathname.startsWith('/merchant')) return 'VENDOR'
  if (pathname.startsWith('/admin')) return 'ADMIN'
  if (pathname.startsWith('/delivery') || pathname.startsWith('/rabbitor')) return 'RABBITOR'
  return null
}

export function roleMatchesPath(userRole: string, pathname: string): boolean {
  const required = requiredRoleForPath(pathname)
  if (!required) return true
  return userRole === required
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
