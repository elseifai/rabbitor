import { resolveAppApiUrl } from '@/lib/app-api'

export type SessionUser = {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  role: string
  displayName?: string | null
}

const TOKEN_KEY = 'rabbit_token'
const USER_KEY = 'rabbit_user'
/** DEV SANDBOX REFACTOR — marks an active sandbox session across navigations. */
const SESSION_ACTIVE_KEY = 'rabbit_session_active'

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
  // Token intentionally not stored in localStorage — lives in httpOnly cookie only
  void token
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  sessionStorage.setItem(SESSION_ACTIVE_KEY, '1')
}

export function getSession(): { token: string; user: SessionUser } | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null

  const token = localStorage.getItem(TOKEN_KEY) ?? ''

  if (token) {
    const exp = decodeJwtExp(token)
    if (exp && exp * 1000 < Date.now()) {
      clearSession()
      return null
    }
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
  sessionStorage.removeItem(SESSION_ACTIVE_KEY)
  void import('@/lib/socket-client').then(({ socketClient }) => {
    socketClient.disconnectAndPurge()
  })
}

export function getAuthHeader(): Record<string, string> {
  const session = getSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.token}` }
}

type AuthFetchOptions = {
  /** DEV SANDBOX REFACTOR — let checkout handle 401 inline instead of hard redirect. */
  skipLogoutRedirect?: boolean
}

/** Fetch wrapper — attaches Bearer token; auto-logout on 401 unless skipped. */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: AuthFetchOptions,
): Promise<Response> {
  const headers = new Headers(init?.headers)
  const auth = getAuthHeader()
  if (auth.Authorization && !headers.has('Authorization')) {
    headers.set('Authorization', auth.Authorization)
  }

  const url =
    typeof input === 'string'
      ? resolveAppApiUrl(input)
      : input instanceof URL
        ? resolveAppApiUrl(input.pathname + input.search)
        : input

  const res = await fetch(url, { ...init, headers, credentials: 'include' })

  if (
    res.status === 401 &&
    typeof window !== 'undefined' &&
    !options?.skipLogoutRedirect
  ) {
    clearSession()
    window.dispatchEvent(new CustomEvent('rabbit:logout'))
    if (!window.location.pathname.startsWith('/auth')) {
      window.location.href = '/auth'
    }
  }

  return res
}
