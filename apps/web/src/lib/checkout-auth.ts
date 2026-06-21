import { resolveAppApiUrl } from '@/lib/app-api'
import { fetchCurrentAuth } from '@/lib/client-auth'
import type { SessionUser } from '@/lib/session'

/** Client-side: refresh httpOnly cookie session as CUSTOMER before checkout payment. */
export async function ensureCustomerCheckoutSession(
  login?: (token: string, user: SessionUser) => void,
): Promise<boolean> {
  try {
    const portalRes = await fetch(resolveAppApiUrl('/api/auth/customer-portal'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    })
    const portalJson = (await portalRes.json()) as {
      success?: boolean
      data?: { token: string; user: SessionUser }
    }
    if (portalJson.success && portalJson.data?.token && portalJson.data?.user) {
      login?.(portalJson.data.token, portalJson.data.user)
      return true
    }
  } catch {
    // fall through to /api/auth/me
  }

  const current = await fetchCurrentAuth()
  if (current?.user?.role === 'CUSTOMER') {
    login?.(current.token, current.user)
    return true
  }

  return false
}
