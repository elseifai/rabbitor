import type { SessionUser } from '@/lib/session'

import { resolveAppApiUrl } from '@/lib/app-api'

export type ClientAuth = {
  token: string
  user: SessionUser
}

/** Fetch current session via API route — avoids stale Server Action IDs after dev rebuilds. */
export async function fetchCurrentAuth(): Promise<ClientAuth | null> {
  const res = await fetch(resolveAppApiUrl('/api/auth/me'), {
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = (await res.json()) as ClientAuth | { token: null; user: null }
  if (!data.token || !data.user) return null
  return data
}
