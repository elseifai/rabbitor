import { SignJWT } from 'jose'
import { prisma } from './prisma'

export async function mintApiAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'rabbit-dev-secret-change-in-production',
  )

  return new SignJWT({ sub: user.id, role: user.role, phone: user.phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret)
}

export function getApiBaseUrl(): string {
  return process.env.API_URL ?? 'http://localhost:4000'
}
