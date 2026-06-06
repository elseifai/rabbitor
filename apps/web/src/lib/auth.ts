import { createHash, randomInt } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from './db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'rabbit-dev-secret-change-in-production',
)
const SESSION_COOKIE = 'rabbit_session'
const OTP_TTL_MS = 5 * 60 * 1000
const DEV_OTP = '123456'

export interface SessionPayload {
  userId: string
  phone: string
  role: string
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
  const code =
    process.env.NODE_ENV === 'production'
      ? randomInt(100000, 999999).toString()
      : DEV_OTP

  await db.otpChallenge.create({
    data: {
      phone: normalized,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  })

  // Production: integrate Firebase Auth / MSG91 / Twilio here
  if (process.env.NODE_ENV !== 'production') {
    return { success: true, devCode: code }
  }
  return { success: true }
}

export async function verifyOtp(
  phone: string,
  code: string,
  role?: 'CUSTOMER' | 'MERCHANT' | 'DELIVERY_PARTNER',
): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizePhone(phone)
  const challenge = await db.otpChallenge.findFirst({
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
    await db.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    })
    return { success: false, error: 'Invalid OTP.' }
  }

  await db.otpChallenge.update({
    where: { id: challenge.id },
    data: { verified: true },
  })

  let user = await db.user.findUnique({ where: { phone: normalized } })
  if (!user) {
    user = await db.user.create({
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

  return { success: true }
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

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function requireSession(roles?: string[]): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) throw new Error('Please log in to continue')

  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user) {
    await clearSession()
    throw new Error('Your session expired. Please log in again.')
  }

  const payload: SessionPayload = {
    userId: user.id,
    phone: user.phone,
    role: user.role,
  }

  if (roles && !roles.includes(user.role)) {
    throw new Error('Access denied')
  }

  return payload
}
