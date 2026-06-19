import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getSessionCookieOptions } from '@/lib/auth'
import { parseAuthRoleParam, getAuthRoleOption } from '@/lib/auth-roles'
import { getPublicAppOrigin } from '@/lib/public-app-url'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

/** Redirects the user to Google's consent screen. */
export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'Google sign-in is not configured' },
      { status: 503 },
    )
  }

  const appOrigin = getPublicAppOrigin(request)

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

  const redirectUri = `${appOrigin}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  })

  const res = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`)
  res.cookies.set('g_oauth_nonce', nonce, {
    ...getSessionCookieOptions(),
    maxAge: 600,
  })
  return res
}
