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
import { logoutAction } from '@/actions/auth'

type AuthContextValue = {
  user: SessionUser | null
  token: string | null
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

  useEffect(() => {
    const session = getSession()
    if (session) {
      setUser(session.user)
      setToken(session.token)
    }
    setHydrated(true)

    const onLogout = () => {
      setUser(null)
      setToken(null)
    }
    window.addEventListener('rabbit:logout', onLogout)
    return () => window.removeEventListener('rabbit:logout', onLogout)
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
