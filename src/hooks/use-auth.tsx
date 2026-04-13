'use client'

import { createContext, useContext, useState, useCallback, useSyncExternalStore, ReactNode } from 'react'

export interface AuthUser {
  id: string
  name: string
  phone: string
  role: 'admin' | 'trainer'
}

interface AuthContextType {
  user: AuthUser | null
  login: (phone: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  isLoading: true,
})

// useSyncExternalStore for reading localStorage safely
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

function getSnapshot(): string {
  try {
    return localStorage.getItem('authUser') || ''
  } catch {
    return ''
  }
}

function getServerSnapshot(): string {
  return ''
}

function parseStoredUser(raw: string): AuthUser | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && parsed.id && parsed.name && parsed.role) {
      return parsed as AuthUser
    }
  } catch {
    // ignore
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const storedUserRaw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const storedUser = parseStoredUser(storedUserRaw)

  // Track manually set user (after login, before localStorage updates propagate)
  const [manualUser, setManualUser] = useState<AuthUser | null>(null)

  // Use manualUser if set, otherwise fall back to storedUser from localStorage
  const user = manualUser || storedUser

  const login = useCallback(async (phone: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      })

      if (!res.ok) return false

      const data = await res.json()
      const authUser: AuthUser = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        role: data.role,
      }

      setManualUser(authUser)
      localStorage.setItem('authUser', JSON.stringify(authUser))
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setManualUser(null)
    localStorage.removeItem('authUser')
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
