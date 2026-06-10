import { createHash, randomBytes, randomInt } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { sendEmail, verificationEmailHtml } from './email'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'rabbit-dev-secret-change-in-production',
)
const SESSION_COOKIE = 'rabbit_session'
const OTP_TTL_MS = 5 * 60 * 1000
const EMAIL_TTL_MS = 10 * 60 * 1000
const DEV_OTP = '123456'

type Role = 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN'

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
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

/** Signs a JWT for the user and sets the httpOnly session cookie. */
async function createSession(user: {
  id: string
  phone: string | null
  email: string | null
  role: string
}): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return token
}

function toAuthUser(user: {
  id: string
  name: string
  phone: string | null
  email: string | null
  role: string
  displayName: string | null
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
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
  const isProd = process.env.NODE_ENV === 'production'
  const code = isProd ? randomInt(100000, 999999).toString() : DEV_OTP

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
    if (msg91Key && msg91Template) {
      try {
        const res = await fetch('https://api.msg91.com/api/v5/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', authkey: msg91Key },
          body: JSON.stringify({ template_id: msg91Template, mobile: `91${normalized}`, otp: code }),
        })
        if (!res.ok) console.warn('[OTP] MSG91 error:', await res.text().catch(() => ''))
      } catch (err) {
        console.warn('[OTP] MSG91 failed:', (err as Error).message)
      }
    } else {
      console.warn('[OTP] MSG91 not configured — OTP will not be sent in production')
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

  const valid = challenge.codeHash === hashOtp(code.trim())
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
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone: normalized,
        name: `User ${normalized.slice(-4)}`,
        role: role ?? 'CUSTOMER',
      },
    })
  }

  const token = await new SignJWT({
    userId: user.id,
    phone: user.phone,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return { success: true, token, user: toAuthUser(user) }
}

/** Creates an email OTP + magic-link challenge and emails it. */
export async function sendEmailOtp(
  email: string,
  role?: Role,
): Promise<{ success: boolean; devCode?: string }> {
  const normalized = normalizeEmail(email)
  const isProd = process.env.NODE_ENV === 'production'
  const code = isProd ? randomInt(100000, 999999).toString() : DEV_OTP
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
  try {
    await sendEmail({
      to: normalized,
      subject: `Your Rabbit verification code: ${code}`,
      html: verificationEmailHtml(code, link),
    })
  } catch (err) {
    console.warn('[EMAIL] send failed:', (err as Error).message)
  }

  return isProd ? { success: true } : { success: true, devCode: code }
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
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        emailVerified: new Date(),
        name: email.split('@')[0],
        role: requestedRole ?? storedRole ?? 'CUSTOMER',
      },
    })
  } else if (!user.emailVerified) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    })
  }

  const token = await createSession(user)
  return { success: true, token, user: toAuthUser(user) }
}

/** Upserts a Google-authenticated user and sets the session. */
export async function signInWithGoogle(
  profile: {
    googleId: string
    email: string
    name?: string | null
  },
  role?: Role,
): Promise<{ token: string; user: AuthUser }> {
  const email = profile.email.toLowerCase()
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: profile.googleId }, { email }] },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        googleId: profile.googleId,
        email,
        emailVerified: new Date(),
        name: profile.name ?? email.split('@')[0],
        role: role ?? 'CUSTOMER',
      },
    })
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: profile.googleId, emailVerified: user.emailVerified ?? new Date() },
    })
  }

  const token = await createSession(user)
  return { token, user: toAuthUser(user) }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
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
    await createSession(user)
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
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? ''
  return { token, user: toAuthUser(user) }
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
    role: user.role,
  }

  if (roles && !roles.includes(user.role)) {
    throw new Error('Access denied')
  }

  return payload
}
