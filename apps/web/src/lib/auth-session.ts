import { jwtVerify } from 'jose'

export const SESSION_COOKIE = 'rabbit_session'

export type EdgeSessionPayload = {
  userId: string
  phone?: string | null
  email?: string | null
  role: string
}

function jwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'rabbit-dev-secret-change-in-production',
  )
}

/** Edge-safe JWT verification for middleware (no DB imports). */
export async function verifySessionCookie(
  token: string | undefined,
): Promise<EdgeSessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, jwtSecretKey())
    return payload as unknown as EdgeSessionPayload
  } catch {
    return null
  }
}
