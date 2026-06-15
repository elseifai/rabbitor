import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { useSecureSessionCookies } from '@/lib/cookie-options'
import { parseAuthRoleParam, getAuthRoleOption } from '@/lib/auth-roles'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.PUBLIC_APP_URL ??
    'http://localhost:3000'
  )
}

/** Redirects the user to Google's consent screen. */
export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'Google sign-in is not configured' },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(request.url)
  const roleParam = searchParams.get('role')
  const role =
    roleParam === 'CUSTOMER' ||
    roleParam === 'VENDOR' ||
    roleParam === 'RABBITOR' ||
    roleParam === 'ADMIN'
      ? roleParam
      : getAuthRoleOption(parseAuthRoleParam(roleParam)).role
  const redirectTo = searchParams.get('redirect') ?? '/'
  const nonce = randomBytes(16).toString('hex')
  const state = Buffer.from(JSON.stringify({ role, redirectTo, nonce })).toString('base64url')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl()}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })

  const res = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`)
  res.cookies.set('g_oauth_nonce', nonce, {
    httpOnly: true,
    secure: useSecureSessionCookies(),
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return res
}
