'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  clearSession as clearLocalSession,
  getSession,
  saveSession,
  type SessionUser,
} from '@/lib/session'
import { logoutAction, getCurrentUserAction } from '@/actions/auth'

type AuthContextValue = {
  user: SessionUser | null
  token: string | null
  hydrated: boolean
  isLoggedIn: boolean
  login: (token: string, user: SessionUser) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // DEV SANDBOX REFACTOR — hydrate from localStorage first, then httpOnly cookie fallback.
  useEffect(() => {
    const hydrateFromServer = () =>
      getCurrentUserAction().then((current) => {
        if (current) {
          saveSession(current.token, current.user)
          setUser(current.user)
          setToken(current.token)
        }
      })

    const session = getSession()
    if (session) {
      setUser(session.user)
      setToken(session.token)
      setHydrated(true)
      void hydrateFromServer()
    } else {
      void hydrateFromServer().finally(() => setHydrated(true))
    }

    const onLogout = () => {
      setUser(null)
      setToken(null)
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'rabbit_token' && event.key !== 'rabbit_user') return
      const next = getSession()
      if (next) {
        setUser(next.user)
        setToken(next.token)
      } else {
        setUser(null)
        setToken(null)
      }
    }

    window.addEventListener('rabbit:logout', onLogout)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('rabbit:logout', onLogout)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const login = useCallback((newToken: string, newUser: SessionUser) => {
    saveSession(newToken, newUser)
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(async () => {
    clearLocalSession()
    setUser(null)
    setToken(null)
    await logoutAction()
    router.push('/auth')
    router.refresh()
  }, [router])

  const value = useMemo(
    () => ({
      user,
      token,
      hydrated,
      isLoggedIn: hydrated && Boolean(user && token),
      login,
      logout,
    }),
    [user, token, hydrated, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
