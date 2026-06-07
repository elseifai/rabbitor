export type SessionUser = {
  id: string
  name: string
  phone: string
  role: string
  displayName?: string | null
}

const TOKEN_KEY = 'rabbit_token'
const USER_KEY = 'rabbit_user'

function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number }
    return payload.exp ?? null
  } catch {
    return null
  }
}

export function saveSession(token: string, user: SessionUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getSession(): { token: string; user: SessionUser } | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(TOKEN_KEY)
  const raw = localStorage.getItem(USER_KEY)
  if (!token || !raw) return null

  const exp = decodeJwtExp(token)
  if (exp && exp * 1000 < Date.now()) {
    clearSession()
    return null
  }

  try {
    const user = JSON.parse(raw) as SessionUser
    return { token, user }
  } catch {
    clearSession()
    return null
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getAuthHeader(): Record<string, string> {
  const session = getSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.token}` }
}

/** Fetch wrapper — auto-logout on 401. */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  const auth = getAuthHeader()
  if (auth.Authorization && !headers.has('Authorization')) {
    headers.set('Authorization', auth.Authorization)
  }

  const res = await fetch(input, { ...init, headers })

  if (res.status === 401 && typeof window !== 'undefined') {
    clearSession()
    window.dispatchEvent(new CustomEvent('rabbit:logout'))
    if (!window.location.pathname.startsWith('/auth')) {
      window.location.href = '/auth'
    }
  }

  return res
}
