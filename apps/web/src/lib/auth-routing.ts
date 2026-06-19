import type { SessionUser } from '@/lib/session'
import type { AuthRoleId } from '@/lib/auth-roles'
import { parseAuthRoleParam } from '@/lib/auth-roles'

export const AUTH_PUBLIC_PREFIXES = [
  '/auth',
  '/login',
  '/admin/login',
  '/delivery/login',
  '/api',
  '/manifest.webmanifest',
] as const

export const AUTH_PROTECTED_PREFIXES = [
  '/checkout',
  '/cart',
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

const PORTAL_PATH_BY_ROLE: Record<string, string> = {
  VENDOR: '/merchant',
  RABBITOR: '/delivery',
  ADMIN: '/admin',
}

/** Whether a signed-in user may use a partner portal (matches middleware rules). */
export function roleCanAccessPortal(userRole: string, requiredRole: string): boolean {
  const portalPath = PORTAL_PATH_BY_ROLE[requiredRole]
  if (!portalPath) return userRole === requiredRole
  return roleMatchesPath(userRole, portalPath)
}

export function roleMatchesPath(userRole: string, pathname: string): boolean {
  const required = requiredRoleForPath(pathname)
  if (!required) return true
  if (userRole === 'ADMIN') return true
  return userRole === required
}

/** True when the signed-in user may continue with the portal they chose at login. */
export function signInPortalMatches(
  userRole: string,
  requestedRole: SessionUser['role'],
): boolean {
  // Any account may browse / shop as a customer
  if (requestedRole === 'CUSTOMER') return true
  if (userRole === requestedRole) return true
  if (userRole === 'ADMIN' && requestedRole !== 'CUSTOMER') return true
  return false
}

export function postSignInDestination(
  userRole: SessionUser['role'],
  requestedRole: SessionUser['role'],
  returnTo: string,
  selectedRedirect: string,
): string {
  if (returnTo !== '/') return returnTo

  // Storefront — any signed-in user may browse as a customer
  if (requestedRole === 'CUSTOMER') return '/'

  if (userRole === 'ADMIN' && requestedRole !== 'CUSTOMER') {
    return selectedRedirect
  }

  if (signInPortalMatches(userRole, requestedRole)) {
    return defaultDashboardForRole(userRole) || selectedRedirect
  }

  return selectedRedirect
}

export function defaultDashboardForRole(role: SessionUser['role']): string {
  switch (role) {
    case 'VENDOR':
      return '/merchant'
    case 'RABBITOR':
      return '/delivery/dashboard'
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
