import { NextResponse } from 'next/server'
import { signInWithGoogle } from '@/lib/auth'

type Role = 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

function fail(reason: string) {
  return NextResponse.redirect(`${appUrl()}/auth?error=${encodeURIComponent(reason)}`)
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

  const cookieNonce = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('g_oauth_nonce='))
    ?.split('=')[1]
  if (!cookieNonce || cookieNonce !== nonce) return fail('Sign-in expired, please try again')

  // Exchange the authorization code for tokens
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
  if (!tokenRes.ok) return fail('Could not verify your Google account')
  const tokens = (await tokenRes.json()) as { access_token?: string }
  if (!tokens.access_token) return fail('Could not verify your Google account')

  const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!profileRes.ok) return fail('Could not read your Google profile')
  const profile = (await profileRes.json()) as {
    sub: string
    email?: string
    name?: string
    email_verified?: boolean
  }
  if (!profile.email) return fail('Your Google account has no email')

  await signInWithGoogle({ googleId: profile.sub, email: profile.email, name: profile.name }, role)

  const res = NextResponse.redirect(`${appUrl()}${redirectTo}`)
  res.cookies.delete('g_oauth_nonce')
  return res
}
