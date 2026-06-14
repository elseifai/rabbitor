import { NextResponse } from 'next/server'
import { GoogleAuthRoleMismatchError, signInWithGoogle } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Role = 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN'

const PERSONA_LOGIN: Record<Role, string> = {
  CUSTOMER: '/auth?role=customer',
  VENDOR: '/auth?role=merchant',
  RABBITOR: '/auth?role=rabbitor',
  ADMIN: '/auth?role=admin',
}

const ROLE_REDIRECT: Record<string, string> = {
  CUSTOMER: '/',
  VENDOR: '/merchant',
  RABBITOR: '/delivery',
  ADMIN: '/admin',
}

const PERSONA_ERROR: Record<Role, string> = {
  CUSTOMER: 'Sign-in failed.',
  VENDOR: 'This email is not registered as a merchant.',
  RABBITOR: 'This email is not registered as a delivery partner.',
  ADMIN: 'This email is not registered as admin.',
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.PUBLIC_APP_URL ??
    'http://localhost:3000'
  )
}

function fail(reason: string, loginPath = '/auth') {
  return NextResponse.redirect(
    `${appUrl()}${loginPath}?error=${encodeURIComponent(reason)}`,
  )
}

/** Handles Google's OAuth redirect: exchanges the code and signs the user in. */
export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return fail('Google sign-in is not configured')

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  if (!code || !state) return fail('Sign-in was cancelled')

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
    return fail('Invalid sign-in state')
  }

  const loginPath = PERSONA_LOGIN[role] ?? '/auth'

  const cookieNonce = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('g_oauth_nonce='))
    ?.split('=')[1]
  if (!cookieNonce || cookieNonce !== nonce) {
    return fail('Sign-in expired, please try again', loginPath)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${appUrl()}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) return fail('Could not verify your Google account', loginPath)
  const tokens = (await tokenRes.json()) as { access_token?: string }
  if (!tokens.access_token) return fail('Could not verify your Google account', loginPath)

  const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!profileRes.ok) return fail('Could not read your Google profile', loginPath)
  const profile = (await profileRes.json()) as {
    sub: string
    email?: string
    name?: string
    picture?: string
    email_verified?: boolean
  }
  if (!profile.email) return fail('Your Google account has no email', loginPath)

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
      return fail(PERSONA_ERROR[err.expectedRole], PERSONA_LOGIN[err.expectedRole])
    }
    throw err
  }

  let destination =
    redirectTo === '/'
      ? (ROLE_REDIRECT[authUser.user.role] ?? '/')
      : redirectTo

  if (authUser.user.role === 'VENDOR') {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: authUser.user.id },
      select: { id: true },
    })
    if (!shop) destination = '/merchant/onboarding'
  } else if (authUser.user.role === 'RABBITOR') {
    const profile = await prisma.rabbitorProfile.findUnique({
      where: { userId: authUser.user.id },
      select: { id: true },
    })
    if (!profile) destination = '/delivery/login?setup=1'
  }

  const res = NextResponse.redirect(
    `${appUrl()}/auth/complete?redirect=${encodeURIComponent(destination)}`,
  )
  res.cookies.delete('g_oauth_nonce')
  return res
}
