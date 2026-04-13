'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem('authUser')
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(false)

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

      setUser(authUser)
      localStorage.setItem('authUser', JSON.stringify(authUser))
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
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
