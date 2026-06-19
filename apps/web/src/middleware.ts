import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionCookie } from '@/lib/auth-session'
import {
  defaultDashboardForRole,
  isProtectedAuthPath,
  isPublicAuthPath,
  loginPathForRole,
  roleHintFromPathname,
  roleMatchesPath,
  signInPortalMatches,
} from '@/lib/auth-routing'
import { getAuthRoleOption, parseAuthRoleParam } from '@/lib/auth-roles'

function isMiddlewareBypassed(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEV_SANDBOX === 'true' ||
    process.env.NODE_ENV !== 'production'
  )
}

const AUTH_FLOW_PATHS = ['/auth/verify', '/auth/complete'] as const

function isAuthFlowPath(pathname: string): boolean {
  return AUTH_FLOW_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function middleware(request: NextRequest) {
  if (isMiddlewareBypassed()) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = await verifySessionCookie(token)

  if (isPublicAuthPath(pathname)) {
    if (session && pathname.startsWith('/auth') && !isAuthFlowPath(pathname)) {
      const redirectParam = request.nextUrl.searchParams.get('redirect')
      const safeRedirect =
        redirectParam &&
        redirectParam.startsWith('/') &&
        !redirectParam.startsWith('/auth')
          ? redirectParam
          : null
      const roleParam = request.nextUrl.searchParams.get('role')
      const selectedPortal = getAuthRoleOption(parseAuthRoleParam(roleParam))

      if (selectedPortal.role === 'CUSTOMER') {
        return NextResponse.redirect(new URL(safeRedirect ?? '/', request.url))
      }

      if (signInPortalMatches(session.role, selectedPortal.role)) {
        return NextResponse.redirect(
          new URL(safeRedirect ?? selectedPortal.redirect, request.url),
        )
      }

      return NextResponse.next()
    }
    return NextResponse.next()
  }

  if (!isProtectedAuthPath(pathname)) {
    return NextResponse.next()
  }

  if (!session) {
    const roleHint = roleHintFromPathname(pathname)
    const loginUrl = new URL(loginPathForRole(roleHint, pathname), request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (!roleMatchesPath(session.role, pathname)) {
    return NextResponse.redirect(new URL(defaultDashboardForRole(session.role), request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|media/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
