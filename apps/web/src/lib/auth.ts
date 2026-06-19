import { createHash, randomBytes, randomInt } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'
import { useSecureSessionCookies } from './cookie-options'
import { prisma } from './prisma'
import { sendEmail, verificationEmailHtml } from './email'
import { DEV_OTP_CODE, isDevOtpBypassEnabled } from './dev-auth'
import { getPublicAppOrigin } from './public-app-url'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Run: openssl rand -base64 32')
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)
import { SESSION_COOKIE } from './auth-session'

export { SESSION_COOKIE }
const OTP_TTL_MS = 5 * 60 * 1000
const EMAIL_TTL_MS = 10 * 60 * 1000
const DEV_OTP = DEV_OTP_CODE

type Role = 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN'

/** Emails allowed to sign in as platform admin via OAuth / OTP. */
export function getAdminBootstrapEmails(): Set<string> {
  const emails = new Set(['dreamsight11@gmail.com'])
  const fromEnv = process.env.ADMIN_BOOTSTRAP_EMAILS
  if (fromEnv) {
    for (const part of fromEnv.split(',')) {
      const normalized = part.trim().toLowerCase()
      if (normalized) emails.add(normalized)
    }
  }
  return emails
}

export function isBootstrapAdminEmail(email: string): boolean {
  return getAdminBootstrapEmails().has(email.trim().toLowerCase())
}

function mergeGoogleProfile(
  user: {
    id: string
    googleId: string | null
    name: string
    displayName: string | null
    avatarUrl: string | null
    emailVerified: Date | null
  },
  profile: { googleId: string; name?: string | null; picture?: string | null },
) {
  return {
    googleId: user.googleId ?? profile.googleId,
    emailVerified: user.emailVerified ?? new Date(),
    name: profile.name?.trim() || user.name,
    displayName: profile.name?.trim() || user.displayName,
    avatarUrl: profile.picture ?? user.avatarUrl,
  }
}

/**
 * DB role — upgraded on partner sign-up; never downgraded when browsing as customer.
 */
function resolveDbRole(
  email: string,
  existingRole: string | null | undefined,
  portalRole: Role,
): Role {
  const bootstrapAdmin = isBootstrapAdminEmail(email.toLowerCase())

  if (portalRole === 'ADMIN') {
    if (bootstrapAdmin || existingRole === 'ADMIN') return 'ADMIN'
    throw new GoogleAuthRoleMismatchError('ADMIN', existingRole ?? 'CUSTOMER')
  }

  if (portalRole === 'RABBITOR') return 'RABBITOR'

  if (portalRole === 'VENDOR') {
    if (!existingRole || existingRole === 'CUSTOMER' || existingRole === 'VENDOR') {
      return 'VENDOR'
    }
    if (bootstrapAdmin && existingRole === 'ADMIN') return 'ADMIN'
    throw new GoogleAuthRoleMismatchError('VENDOR', existingRole)
  }

  return (existingRole as Role) ?? 'CUSTOMER'
}

function shouldUpgradeDbRole(current: string, next: Role): boolean {
  if (next === 'CUSTOMER') return false
  if (current === next) return false
  return true
}

function resolvePortalRole(portalRole?: Role, fallbackDbRole?: string | null): Role {
  if (portalRole) return portalRole
  return (fallbackDbRole as Role) ?? 'CUSTOMER'
}

export class GoogleAuthRoleMismatchError extends Error {
  readonly expectedRole: Role
  readonly actualRole: string

  constructor(expectedRole: Role, actualRole: string) {
    super('ROLE_MISMATCH')
    this.name = 'GoogleAuthRoleMismatchError'
    this.expectedRole = expectedRole
    this.actualRole = actualRole
  }
}

export interface SessionPayload {
  userId: string
  phone?: string | null
  email?: string | null
  role: string
}

export interface AuthUser {
  id: string
  name: string
  phone: string | null
  email: string | null
  role: string
  displayName: string | null
}

function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error('Enter a valid email address')
  }
  return trimmed
}

function appUrl(): string {
  return getPublicAppOrigin()
}

/** Cookie options shared by server actions and OAuth redirect responses. */
export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: useSecureSessionCookies(),
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  }
}

/** Signs a JWT — `portalRole` is the active UI portal; DB role may differ. */
async function createSession(
  user: { id: string; phone: string | null; email: string | null; role: string },
  portalRole?: Role,
): Promise<string> {
  const sessionRole = resolvePortalRole(portalRole, user.role)
  const token = await new SignJWT({
    userId: user.id,
    phone: user.phone,
    email: user.email,
    role: sessionRole,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, getSessionCookieOptions())
  return token
}

async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

function toAuthUser(
  user: {
    id: string
    name: string
    phone: string | null
    email: string | null
    role: string
    displayName: string | null
  },
  portalRole?: Role,
): AuthUser {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: portalRole ?? user.role,
    displayName: user.displayName,
  }
}

function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  throw new Error('Enter a valid 10-digit mobile number')
}

export async function sendOtp(phone: string): Promise<{ success: boolean; devCode?: string }> {
  const normalized = normalizePhone(phone)
  const bypass = isDevOtpBypassEnabled()
  const isProd = process.env.NODE_ENV === 'production' && !bypass
  const code = isProd ? randomInt(100000, 999999).toString() : DEV_OTP

  // Rate limit: max 5 OTP requests per phone per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentCount = await prisma.otpChallenge.count({
    where: { phone: normalized, createdAt: { gt: oneHourAgo } },
  })
  if (recentCount >= 5) {
    throw new Error('Too many OTP requests. Please try again in an hour.')
  }

  // Delete old unverified challenges for this phone
  await prisma.otpChallenge.deleteMany({
    where: { phone: normalized, verified: false },
  })

  await prisma.otpChallenge.create({
    data: {
      phone: normalized,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  })

  if (isProd) {
    const msg91Key = process.env.MSG91_AUTH_KEY
    const msg91Template = process.env.MSG91_TEMPLATE_ID

    if (!msg91Key || !msg91Template) {
      throw new Error('OTP service is not configured. Please contact support.')
    }

    const res = await fetch('https://api.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: msg91Key },
      body: JSON.stringify({
        template_id: msg91Template,
        mobile: `91${normalized}`,
        otp: code,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => 'unknown error')
      console.error('[OTP] MSG91 error:', body)
      throw new Error('Could not send OTP. Please try again.')
    }

    return { success: true }
  }

  // Dev: return the code so UI can show it
  return { success: true, devCode: code }
}

export async function verifyOtp(
  phone: string,
  code: string,
  role?: 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN',
): Promise<{
  success: boolean
  error?: string
  token?: string
  user?: AuthUser
}> {
  const normalized = normalizePhone(phone)
  const trimmedCode = code.trim()

  // DEV ONLY BYPASS — static OTP `123456` skips SMS gateway; lookup seeded user by phone.
  if (isDevOtpBypassEnabled() && trimmedCode === DEV_OTP) {
    const user = await prisma.user.findUnique({ where: { phone: normalized } })
    if (!user) {
      return {
        success: false,
        error: 'Test user not found for this phone. Run `pnpm db:seed`.',
      }
    }
    const portalRole = resolvePortalRole(role, user.role)
    const token = await createSession(user, portalRole)
    return { success: true, token, user: toAuthUser(user, portalRole) }
  }

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      phone: normalized,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!challenge) return { success: false, error: 'OTP expired. Request a new one.' }
  if (challenge.attempts >= 5) return { success: false, error: 'Too many attempts.' }

  const valid = challenge.codeHash === hashOtp(trimmedCode)
  if (!valid) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    })
    return { success: false, error: 'Invalid OTP.' }
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { verified: true },
  })

  let user = await prisma.user.findUnique({ where: { phone: normalized } })
  const portalRole = resolvePortalRole(role, user?.role)

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone: normalized,
        name: `User ${normalized.slice(-4)}`,
        role: portalRole === 'CUSTOMER' ? 'CUSTOMER' : portalRole,
      },
    })
  } else if (role && role !== 'CUSTOMER' && shouldUpgradeDbRole(user.role, role)) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role },
    })
  }

  const token = await createSession(user, portalRole)
  return { success: true, token, user: toAuthUser(user, portalRole) }
}

/** Creates an email OTP + magic-link challenge and emails it. */
export async function sendEmailOtp(
  email: string,
  role?: Role,
): Promise<{ success: boolean; devCode?: string; error?: string }> {
  const normalized = normalizeEmail(email)
  const isProd = process.env.NODE_ENV === 'production'
  const bypass = isDevOtpBypassEnabled()
  // GOOGLE MAPS & AUTH ACTIVATION — test-server email OTP without Resend
  const code = bypass || !isProd ? DEV_OTP : randomInt(100000, 999999).toString()
  const token = randomBytes(32).toString('hex')

  await prisma.emailVerification.deleteMany({ where: { email: normalized, verified: false } })
  await prisma.emailVerification.create({
    data: {
      email: normalized,
      codeHash: hashOtp(code),
      token,
      role: role ?? null,
      expiresAt: new Date(Date.now() + EMAIL_TTL_MS),
    },
  })

  const link = `${appUrl()}/auth/verify?token=${token}`
  if (!bypass) {
    try {
      await sendEmail({
        to: normalized,
        subject: `Your Rabbit verification code: ${code}`,
        html: verificationEmailHtml(code, link),
      })
    } catch (err) {
      const message = (err as Error).message
      console.warn('[EMAIL] send failed:', message)
      return { success: false, error: message }
    }
  }

  if (bypass || !isProd) {
    return { success: true, devCode: code }
  }
  return { success: true }
}

/** Verifies an email OTP, creating/returning the user and setting the session. */
export async function verifyEmailOtp(
  email: string,
  code: string,
  role?: Role,
): Promise<{ success: boolean; error?: string; token?: string; user?: AuthUser }> {
  const normalized = normalizeEmail(email)
  const challenge = await prisma.emailVerification.findFirst({
    where: { email: normalized, verified: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })

  if (!challenge) return { success: false, error: 'Code expired. Request a new one.' }
  if (challenge.attempts >= 5) return { success: false, error: 'Too many attempts.' }

  if (challenge.codeHash !== hashOtp(code.trim())) {
    await prisma.emailVerification.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    })
    return { success: false, error: 'Invalid code.' }
  }

  return finalizeEmailChallenge(challenge.id, normalized, challenge.role as Role | null, role)
}

/** Verifies a magic-link token and sets the session. */
export async function verifyEmailToken(
  token: string,
): Promise<{ success: boolean; error?: string; token?: string; user?: AuthUser }> {
  const challenge = await prisma.emailVerification.findUnique({ where: { token } })
  if (!challenge || challenge.verified || challenge.expiresAt < new Date()) {
    return { success: false, error: 'This link is invalid or has expired.' }
  }
  return finalizeEmailChallenge(
    challenge.id,
    challenge.email,
    challenge.role as Role | null,
    undefined,
  )
}

async function finalizeEmailChallenge(
  challengeId: string,
  email: string,
  storedRole: Role | null,
  requestedRole?: Role,
): Promise<{ success: boolean; error?: string; token?: string; user?: AuthUser }> {
  await prisma.emailVerification.update({ where: { id: challengeId }, data: { verified: true } })

  let user = await prisma.user.findUnique({ where: { email } })
  const portalRole = resolvePortalRole(requestedRole ?? storedRole ?? undefined, user?.role)
  let dbRole: Role
  try {
    dbRole = resolveDbRole(email, user?.role, portalRole)
  } catch (err) {
    if (err instanceof GoogleAuthRoleMismatchError) {
      return {
        success: false,
        error:
          err.expectedRole === 'ADMIN'
            ? 'This email is not registered as admin.'
            : err.expectedRole === 'VENDOR'
              ? 'This email is not registered as a merchant.'
              : 'This email is not registered as a delivery partner.',
      }
    }
    throw err
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        emailVerified: new Date(),
        name: email.split('@')[0],
        role: dbRole,
      },
    })
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: user.emailVerified ?? new Date(),
        ...(shouldUpgradeDbRole(user.role, dbRole) ? { role: dbRole } : {}),
      },
    })
  }

  const token = await createSession(user, portalRole)
  return { success: true, token, user: toAuthUser(user, portalRole) }
}

/** Upserts a Google-authenticated user and sets the session. */
export async function signInWithGoogle(
  profile: {
    googleId: string
    email: string
    name?: string | null
    picture?: string | null
  },
  role?: Role,
): Promise<{ token: string; user: AuthUser }> {
  const email = profile.email.toLowerCase()
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: profile.googleId }, { email }] },
  })

  const displayName = profile.name?.trim() || email.split('@')[0]
  const portalRole = resolvePortalRole(role, user?.role)
  const dbRole = resolveDbRole(email, user?.role, portalRole)

  if (!user) {
    user = await prisma.user.create({
      data: {
        googleId: profile.googleId,
        email,
        emailVerified: new Date(),
        name: displayName,
        displayName,
        avatarUrl: profile.picture ?? null,
        role: dbRole,
      },
    })
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...mergeGoogleProfile(user, profile),
        ...(shouldUpgradeDbRole(user.role, dbRole) ? { role: dbRole } : {}),
      },
    })
  }

  const token = await createSession(user, portalRole)
  return { token, user: toAuthUser(user, portalRole) }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(SESSION_COOKIE)?.value
  if (cookieToken) {
    const session = await verifySessionToken(cookieToken)
    if (session) return session
  }

  // DEV SANDBOX REFACTOR — accept Bearer token when httpOnly cookie is unavailable (HTTP VPS).
  const authHeader = (await headers()).get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return verifySessionToken(authHeader.slice(7))
  }

  return null
}

/** Resolve session to a live DB user (handles stale JWT after db:seed). */
export async function resolveSessionUser(session: SessionPayload) {
  let user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (user) return user

  if (session.email) {
    user = await prisma.user.findUnique({ where: { email: session.email } })
  }
  if (!user && session.phone) {
    user = await prisma.user.findUnique({ where: { phone: session.phone } })
  }
  if (user) {
    await createSession(user, session.role as Role)
    return user
  }

  await clearSession()
  return null
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/** Returns the current token + live user for client hydration after a redirect login. */
export async function getCurrentAuth(): Promise<{ token: string; user: AuthUser } | null> {
  const session = await getSession()
  if (!session) return null
  const user = await resolveSessionUser(session)
  if (!user) return null

  const cookieStore = await cookies()
  let token = cookieStore.get(SESSION_COOKIE)?.value ?? ''
  if (!token) {
    const authHeader = (await headers()).get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    }
  }

  return { token, user: toAuthUser(user, session.role as Role) }
}

/** Re-issue JWT with CUSTOMER portal so storefront checkout works for partner accounts. */
export async function switchToCustomerPortal(): Promise<{ token: string; user: AuthUser } | null> {
  const session = await getSession()
  if (!session) return null

  const user = await resolveSessionUser(session)
  if (!user) return null

  if (session.role === 'CUSTOMER') {
    const cookieStore = await cookies()
    let token = cookieStore.get(SESSION_COOKIE)?.value ?? ''
    if (!token) {
      const authHeader = (await headers()).get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7)
      }
    }
    return { token, user: toAuthUser(user, 'CUSTOMER') }
  }

  const token = await createSession(user, 'CUSTOMER')
  return { token, user: toAuthUser(user, 'CUSTOMER') }
}

export async function requireSession(roles?: string[]): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) throw new Error('Please log in to continue')

  const user = await resolveSessionUser(session)
  if (!user) throw new Error('Your session expired. Please log in again.')

  const payload: SessionPayload = {
    userId: user.id,
    phone: user.phone,
    email: user.email,
    role: session.role,
  }

  if (roles && !roles.includes(user.role) && user.role !== 'ADMIN') {
    throw new Error('Access denied')
  }

  return payload
}
