import { NextResponse } from 'next/server'
import { GoogleAuthRoleMismatchError, getSessionCookieOptions, signInWithGoogle } from '@/lib/auth'
import { SESSION_COOKIE } from '@/lib/auth-session'
import { prisma } from '@/lib/prisma'
import { getPublicAppOrigin, publicAppUrl } from '@/lib/public-app-url'

type Role = 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN'

const PERSONA_LOGIN: Record<Role, string> = {
  CUSTOMER: '/auth',
  VENDOR: '/auth?role=merchant',
  RABBITOR: '/delivery/login',
  ADMIN: '/admin/login',
}

const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: '/',
  VENDOR: '/merchant',
  RABBITOR: '/delivery/dashboard',
  ADMIN: '/admin',
}

const PERSONA_ERROR: Record<Role, string> = {
  CUSTOMER: 'Sign-in failed.',
  VENDOR: 'This email is not registered as a merchant.',
  RABBITOR: 'Could not sign in as a delivery partner. Please try again.',
  ADMIN: 'This email is not registered as admin.',
}

function fail(request: Request, reason: string, role: Role = 'CUSTOMER') {
  const loginPath = PERSONA_LOGIN[role] ?? '/auth'
  const url = new URL(publicAppUrl(loginPath, request))
  url.searchParams.set('error', reason)
  return NextResponse.redirect(url)
}

async function resolvePostLoginDestination(
  requestedPortal: Role,
  redirectTo: string,
  userId: string,
): Promise<string> {
  if (requestedPortal === 'CUSTOMER') {
    return redirectTo !== '/' ? redirectTo : '/'
  }

  if (requestedPortal === 'VENDOR') {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    })
    return shop ? ROLE_HOME.VENDOR : '/merchant/onboarding'
  }

  if (requestedPortal === 'RABBITOR') {
    const profile = await prisma.rabbitorProfile.findUnique({
      where: { userId },
      select: { isOnboarded: true },
    })
    if (!profile?.isOnboarded) return '/delivery/login?setup=1'
    return ROLE_HOME.RABBITOR
  }

  if (requestedPortal === 'ADMIN') return ROLE_HOME.ADMIN

  return ROLE_HOME.CUSTOMER
}

/** Handles Google's OAuth redirect: exchanges the code and signs the user in. */
export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return fail(request, 'Google sign-in is not configured', 'CUSTOMER')
  }

  const appOrigin = getPublicAppOrigin(request)

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  if (!code || !state) return fail(request, 'Sign-in was cancelled', 'CUSTOMER')

  let role: Role = 'CUSTOMER'
  let redirectTo = '/'
  let nonce = ''
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString()) as {
      role: Role
      redirectTo: string
      nonce: string
    }
    role = decoded.role
    redirectTo = decoded.redirectTo
    nonce = decoded.nonce
  } catch {
    return fail(request, 'Invalid sign-in state', role)
  }

  const cookieNonce = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('g_oauth_nonce='))
    ?.split('=')[1]

  if (!cookieNonce || cookieNonce !== nonce) {
    return fail(request, 'Sign-in expired, please try again', role)
  }

  const redirectUri = `${appOrigin}/api/auth/google/callback`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('[Google OAuth] token exchange failed:', await tokenRes.text().catch(() => ''))
    return fail(request, 'Could not verify your Google account', role)
  }

  const tokens = (await tokenRes.json()) as { access_token?: string }
  if (!tokens.access_token) {
    return fail(request, 'Could not verify your Google account', role)
  }

  const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!profileRes.ok) return fail(request, 'Could not read your Google profile', role)

  const profile = (await profileRes.json()) as {
    sub: string
    email?: string
    name?: string
    picture?: string
  }
  if (!profile.email) return fail(request, 'Your Google account has no email', role)

  let authUser
  try {
    authUser = await signInWithGoogle(
      {
        googleId: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
      role,
    )
  } catch (err) {
    if (err instanceof GoogleAuthRoleMismatchError) {
      return fail(request, PERSONA_ERROR[err.expectedRole], err.expectedRole)
    }
    throw err
  }

  const destination = await resolvePostLoginDestination(role, redirectTo, authUser.user.id)

  const completeUrl = new URL(publicAppUrl('/auth/complete', request))
  completeUrl.searchParams.set('redirect', destination)

  const res = NextResponse.redirect(completeUrl)
  res.cookies.set(SESSION_COOKIE, authUser.token, getSessionCookieOptions())
  res.cookies.delete('g_oauth_nonce')
  return res
}
